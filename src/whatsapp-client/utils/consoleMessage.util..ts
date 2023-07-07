import WAWebJS from 'whatsapp-web.js';

export async function print(message: WAWebJS.Message) {
  const messageChat = await message.getChat();
  const date = new Date(Number(`${message.timestamp}000`));
  const m_date = date.toLocaleDateString();
  const m_time = date.toLocaleTimeString().slice(0, 5);

  const fromNumber = messageChat.id.user;

  console.log(`${m_date} ${m_time} [+${fromNumber}]: `, message.body);
}
