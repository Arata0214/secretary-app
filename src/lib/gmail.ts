import { google } from 'googleapis';

export async function sendEmail(
  accessToken: string,
  refreshToken: string,
  to: string,
  subject: string,
  bodyHtml: string
) {
  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  authClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: authClient });

  // RFC 2822 format + base64url encode
  const rawMessage = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    bodyHtml,
  ].join('\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}
