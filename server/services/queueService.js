import rabbitmq from '../config/rabbitmq.js';

class QueueService {
  // Queue notification for offline users
  async queueNotification(data) {
    try {
      if (!rabbitmq.isConnected) {
        // Silently skip if RabbitMQ is not available
        return false;
      }
      
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
    } catch (error) {
      console.error('Failed to queue notification:', error.message);
      return false;
    }
  }
}

export default new QueueService();
