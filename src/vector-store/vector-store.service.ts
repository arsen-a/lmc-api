import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { ConfigService } from '@nestjs/config';
import { FileEntity } from 'src/files/files.entity';
import { ContentChunk } from 'src/content-chunks/content-chunks.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { Milvus } from '@langchain/community/vectorstores/milvus';
import { formatDocumentsAsString } from 'langchain/util/document';
import { Observable } from 'rxjs';
import { CollabPromptMessageDto } from 'src/collabs/collabs.dto';
import { Document } from '@langchain/core/documents';

// TODO: Refactor the whole service
@Injectable()
export class VectorStoreService {
  // TODO: Refactor to use langchain
  private readonly googleClient: GoogleGenAI;
  private readonly milvusClient: MilvusClient;
  // ============================================
  private llm: ChatGoogleGenerativeAI;
  private embeddings: GoogleGenerativeAIEmbeddings;
  private vectorStore: Milvus;

  private readonly collectionName = 'collab_content_chunks';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ContentChunk)
    private readonly contentChunkRepository: Repository<ContentChunk>,
  ) {
    this.googleClient = new GoogleGenAI({
      apiKey: this.configService.get('google.geminiApiKey'),
    });

    this.milvusClient = new MilvusClient({
      address: this.configService.get('milvus.uri') ?? '',
      token: this.configService.get('milvus.token') ?? '',
    });

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('google.geminiApiKey'),
      streaming: true,
      model: 'gemini-2.0-flash',
    });

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: this.configService.get<string>('google.geminiApiKey'),
      model: 'gemini-embedding-exp-03-07',
    });

    this.vectorStore = new Milvus(this.embeddings, {
      clientConfig: {
        token: this.configService.get<string>('milvus.token') ?? '',
        address: this.configService.get<string>('milvus.uri') ?? '',
      },
      collectionName: this.collectionName,
      indexCreateOptions: {
        metric_type: 'COSINE',
        index_type: 'HNSW',
      },
      vectorField: 'vector',
    });

    this.vectorStore.fields = ['id', 'metadata'];
  }

  async createChunksAndEmbeddings(data: {
    rawFile: Express.Multer.File;
    savedFile: FileEntity;
    relatedModelId: string;
    relatedModelName: string;
  }) {
    const { savedFile, relatedModelId, relatedModelName, rawFile } = data;

    const contentChunks: ContentChunk[] = [];

    if (rawFile.mimetype === 'text/plain') {
      const content = rawFile.buffer.toString('utf-8');
      const cleanedContent = content.replace(/\s+/g, ' ').trim();
      const chunk = new ContentChunk();
      chunk.file = savedFile;
      chunk.content = cleanedContent;
      contentChunks.push(chunk);
    }

    if (!contentChunks.length) {
      return;
    }

    let createdContentChunks: ContentChunk[];

    try {
      createdContentChunks = await this.contentChunkRepository.manager.transaction(
        async (transactionalEntityManager) => {
          return await transactionalEntityManager.save(ContentChunk, contentChunks);
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error saving content chunks to the database',
        String(error),
      );
    }

    const { embeddings } = await this.googleClient.models.embedContent({
      model: 'gemini-embedding-exp-03-07',
      contents: createdContentChunks.map((chunk) => chunk.content),
      config: {
        taskType: 'SEMANTIC_SIMILARITY',
      },
    });

    if (embeddings === undefined) {
      throw new InternalServerErrorException('Error generating embeddings for file');
    }

    const vectorRecords = embeddings.map((embedding, index) => {
      const chunk = createdContentChunks[index];
      return {
        id: chunk.id,
        vector: embedding.values,
        metadata: {
          content: chunk.content,
          fileId: savedFile.id,
          relatedModelId,
          relatedModelName,
        },
      };
    });

    await this.milvusClient.upsert({
      collection_name: 'collab_content_chunks',
      data: vectorRecords,
    });
  }

  processMessageStream(
    collabId: string,
    messages: CollabPromptMessageDto[],
  ): Observable<{ data: string }> {
    const latestUserMessage = messages[messages.length - 1].content;
    const chatHistory = messages
      .slice(0, -1)
      .map((msg) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content),
      );

    const retriever = this.vectorStore.asRetriever({
      k: 5,
      filter: `metadata["relatedModelName"] == 'Collab' and metadata["relatedModelId"] == '${collabId}'`,
    });

    const systemMessageContent = `
      You are an assistant working at "LLM Collab" that answers user questions based on the context provided below.
      You do not tell the user that you are answering based on the context.
      You are not allowed to make up information or hallucinate.
      If the question is not related to the context explain that you are not able to answer and keep the conversation going in a friendly manner.
      If the context is not enough to answer the question, you can ask for more information to lead you to the answer.
    `;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemMessageContent + '\nContext:\n{context}'],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);

    type ChainInput = { input: string; chat_history: typeof chatHistory };

    const retrieverChain = RunnableSequence.from([
      (input: ChainInput) => input.input,
      retriever,
      new RunnableLambda({
        func: (docs: Document<{ metadata: { content: string } }>[]) => {
          return docs.map((doc) => {
            doc.pageContent = doc.metadata.metadata.content;
            return doc;
          });
        },
      }),
      formatDocumentsAsString,
    ]);

    const conversationalRetrievalChain = RunnableSequence.from([
      {
        context: retrieverChain,
        input: (input: ChainInput) => input.input,
        chat_history: (input: ChainInput) => input.chat_history,
      },
      prompt,
      this.llm,
      new StringOutputParser(),
    ]);

    return new Observable<{ data: string }>((subscriber) => {
      conversationalRetrievalChain
        .stream({
          input: latestUserMessage,
          chat_history: chatHistory,
        })
        .then(async (stream) => {
          for await (const chunk of stream) {
            subscriber.next({ data: chunk });
          }
          subscriber.complete();
        })
        .catch((error) => {
          console.error('Streaming Error:', error);
          subscriber.error(error);
        });
    });
  }
}
