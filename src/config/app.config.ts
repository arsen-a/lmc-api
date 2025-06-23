export default () => ({
  app: {
    secret: process.env.APP_SECRET,
    url: process.env.APP_URL,
  },
  clientApp: {
    url: process.env.CLIENT_APP_URL,
  },
});
