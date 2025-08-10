import mongoose from 'mongoose';
import Ticket from './server/models/Ticket.js';
import { encrypt, decrypt } from './server/utils/encryption.js';

// Test the ticket status update logic
async function testTicketStatusUpdate() {
  try {
    // Connect to MongoDB (you'll need to update this connection string)
    await mongoose.connect('mongodb://localhost:27017/your_database_name');
    console.log('Connected to MongoDB');
    
    // Create a test ticket with 'new' status
    const testTicket = new Ticket({
      userId: encrypt('test_user_id'),
      subject: 'Test Ticket',
      description: 'Test Description',
      number: 'TEST123',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [{
        sender: 'user',
        senderId: encrypt('test_user_id'),
        message: encrypt('Test message'),
        timestamp: new Date()
      }]
    });
    
    await testTicket.save();
    console.log('Test ticket created with ID:', testTicket._id);
    
    // Simulate the reply logic
    const currentTicket = await Ticket.findById(testTicket._id);
    const decryptedCurrentTicket = currentTicket.decryptSensitiveData();
    console.log('Current ticket status:', decryptedCurrentTicket.status);
    
    // Prepare update object (same logic as in the route)
    const updateObj = {
      $push: { 
        messages: { 
          sender: 'admin', 
          senderId: encrypt('admin_id'), 
          message: encrypt('Admin reply'), 
          timestamp: new Date() 
        } 
      },
      $set: { updatedAt: new Date() }
    };
    
    // If admin is replying to a new ticket, automatically mark it as opened
    if (decryptedCurrentTicket.status === 'new') {
      updateObj.$set.status = 'opened';
      console.log('Auto-updating ticket status from new to opened');
      console.log('Update object:', JSON.stringify(updateObj, null, 2));
    }
    
    // Execute the update
    const updatedTicket = await Ticket.findByIdAndUpdate(
      testTicket._id,
      updateObj,
      { new: true }
    );
    
    const decryptedUpdatedTicket = updatedTicket.decryptSensitiveData();
    console.log('Updated ticket status:', decryptedUpdatedTicket.status);
    console.log('Update successful!');
    
    // Clean up - delete the test ticket
    await Ticket.findByIdAndDelete(testTicket._id);
    console.log('Test ticket cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testTicketStatusUpdate();
