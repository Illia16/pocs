const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { initializeAuth } = require('./auth');
require('dotenv').config();

const mime = require('mime-types');
const { createMimeMessage } = require('mimetext');
const { initProcessPdf } = require('./processPdf');

const SEARCH_QUERY = process.env.SEARCH_QUERY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;
const PDF_PASSWORD = process.env.PDF_PASSWORD;

// Initialize auth and start the app
initializeAuth(listMessages);

const responseWithError = (errorCode = '500', errorMsg = 'Something went wrong...') => {
  return {
      statusCode: errorCode,
      body: JSON.stringify({
          success: false,
          message: errorMsg,
      }),
  }
};

async function listMessages(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: SEARCH_QUERY,
      includeSpamTrash: true,
      maxResults: 1,
    });
    console.log('msges', res.data.messages);

    if (!res.data.messages || res.data.messages.length === 0) {
      throw new Error('No messages found.');
    }

    const messageId = res.data.messages[0].id;
    await getMessageWithAttachments(auth, messageId);
  } catch (error) {
    return responseWithError(500, error.message);
  }
}

const getMessageWithAttachments = async (auth, messageId) => {
  const gmail = google.gmail({ version: 'v1', auth });
  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    const parts = res.data.payload.parts;
    console.log('parts', parts);

    for (const part of parts) {
      if (part.filename && part.body && part.body.attachmentId) {
        console.log('part', part);

        const attachmentId = part.body.attachmentId;
        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachmentId
        });

        // Convert base64url to base64
        const attachmentBase64Data = attachment.data.data
          .replace(/-/g, '+')
          .replace(/_/g, '/');

        // Decode base64 to buffer and save to file
        const decodedData = Buffer.from(attachmentBase64Data, 'base64');
        fs.writeFileSync(part.filename, decodedData);
        // Process the PDF, read the redacted pdf and send it
        await initProcessPdf(part.filename, PDF_PASSWORD);
        const redactedPdf = fs.readFileSync('redacted_decrypted_' + part.filename);
        const base64Data = Buffer.from(redactedPdf).toString('base64');
        await sendEmailWithAttachment(auth, base64Data, part);
        //

        // await sendEmailWithAttachment(auth, attachmentBase64Data, part); // if emailing original pdf directly
      }
    }
  } catch (error) {
    return responseWithError(500, error.message);
  }
}

const sendEmailWithAttachment = async (auth, base64Data, part) => {
  const gmail = google.gmail({ version: 'v1', auth });

  const message = createMimeMessage();
  message.setSender(SENDER_EMAIL);
  message.setRecipients([SENDER_EMAIL, RECIPIENT_EMAIL]);
  message.setSubject(`AUTO-EMAIL:${part.filename}`);
  message.addMessage({
      contentType: 'text/plain',
      data: 'This email was sent automatically.',
  });

  const contentType = mime.lookup(part.filename);
  console.log('contentType', contentType);

  message.addAttachment({
      filename: part.filename,
      contentType: contentType,
      data: base64Data,
  });

  const rawMessage = Buffer.from(message.asRaw())
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });

    console.log(`Email sent to ${SENDER_EMAIL} and ${RECIPIENT_EMAIL} with attachment: ${part.filename}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};