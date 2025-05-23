import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { TaskType } from '@google/generative-ai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { Milvus } from '@langchain/community/vectorstores/milvus';
import { formatDocumentsAsString } from 'langchain/util/document';
import { Observable } from 'rxjs';
import { CollabPromptMessageDto } from 'src/collabs/collabs.dto';
import { Document } from '@langchain/core/documents';
import { ContentChunksService } from 'src/content-chunks/content-chunks.service';
import { User } from 'src/users/entities/user.entity';
import { Collab } from 'src/collabs/entities/collab.entity';

@Injectable()
export class VectorStoreService {
  private llm: ChatGoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly contentChunkService: ContentChunksService,
  ) {
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('google.geminiApiKey'),
      streaming: true,
      model: 'gemini-2.0-flash',
    });
  }

  private getVectorStoreInstance(task: 'query' | 'store'): Milvus {
    const embeddingProvider = new GoogleGenerativeAIEmbeddings({
      apiKey: this.configService.get<string>('google.geminiApiKey'),
      model: 'gemini-embedding-exp-03-07',
      taskType: task === 'query' ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT,
    });

    const vectorStore = new Milvus(embeddingProvider, {
      clientConfig: {
        token: this.configService.get<string>('milvus.token') ?? '',
        address: this.configService.get<string>('milvus.uri') ?? '',
      },
      collectionName: 'collab_content_chunks',
      indexCreateOptions: {
        metric_type: 'COSINE',
        index_type: 'HNSW',
      },
      vectorField: 'vector',
      primaryField: 'id',
      textField: 'content',
    });

    vectorStore.fields = ['content', 'chunkId', 'fileId', 'collabId'];
    return vectorStore;
  }

  async createChunksAndEmbeddings(data: { file: Express.Multer.File; user: User; collab: Collab }) {
    const { user, collab, file } = data;

    const createdContentChunks = await this.contentChunkService.chunkCollabFileContent({
      file,
      user,
      collab,
    });

    if (!createdContentChunks.length) {
      return;
    }

    const fileId = createdContentChunks[0].file.id;

    const documents = createdContentChunks.map((chunk) => {
      return new Document({
        pageContent: chunk.content,
        metadata: {
          chunkId: chunk.id,
          fileId,
          collabId: collab.id,
        },
      });
    });

    const ids = createdContentChunks.map(({ id }) => id);

    try {
      await this.getVectorStoreInstance('store').addDocuments(documents, { ids });
    } catch (error) {
      console.error('Error adding documents to Milvus via Langchain:', error);
      throw new InternalServerErrorException(
        'Error processing the provided data',
        'Error generating embeddings or saving to vector store',
      );
    }
  }

  promptCollab(collabId: string, messages: CollabPromptMessageDto[]): Observable<{ data: string }> {
    const latestUserMessage = messages[messages.length - 1].content;
    const chatHistory = messages
      .slice(0, -1)
      .map((msg) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content),
      );

    const retriever = this.getVectorStoreInstance('query').asRetriever({
      k: 5,
      filter: `collabId == '${collabId}'`,
    });

    const systemMessageContent = `
      You are an assistant working at "LLM Collab" that answers user questions based on the context provided below.
      You do not tell the user that you are answering based on the context.
      You are not allowed to make up information or hallucinate.
      If the question is not related to the context explain that you are not able to answer and keep the conversation going in a friendly manner.
      If the context is not enough to answer the question, you can ask for more information to lead you to the answer.
    `;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemMessageContent + '\n\nContext:\n{context}'],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);

    type ChainInput = { input: string; chat_history: typeof chatHistory };

    const retrieverChain = RunnableSequence.from([
      (input: ChainInput) => input.input,
      retriever,
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
