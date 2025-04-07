export default () => {
  const port = process.env.MAIL_PORT;
  if (!port) {
    throw new Error('MAIL_PORT is not defined');
  }
  return {
    mail: {
      host: process.env.MAIL_HOST,
      port: parseInt(port, 10),
      secure: process.env.MAIL_SECURE === 'true',
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  };
};
