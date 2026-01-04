import rabbitmq from '../config/rabbitmq.js';

class QueueService {
  // Queue AI request for background processing
  async queueAIRequest(data) {
    const message = {
      userId: data.userId,
      content: data.content,
      timestamp: new Date().toISOString()
    };

    return await rabbitmq.publish('ai-queue', message);
  }

  // Queue notification for offline users
  async queueNotification(data) {
    const message = {
      type: data.type || 'message', // 'message', 'channel-message'
      senderId: data.senderId,
      senderName: data.senderName,
      recipientId: data.recipientId,
      content: data.content,
      messageType: data.messageType,
      channelId: data.channelId || null,
      channelName: data.channelName || null,
      timestamp: new Date().toISOString()
    };

    return await rabbitmq.publish('notification-queue', message);
  }
}

export default new QueueService();
