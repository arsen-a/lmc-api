export default () => {
  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      geminiApiKey: process.env.GEMINI_API_KEY,
    },
  };
};
