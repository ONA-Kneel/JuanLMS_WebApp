import Notification from '../models/Notification.js';
import Class from '../models/Class.js';
import User from '../models/User.js';

// Create notifications for all students in a class
export const createClassNotifications = async (classID, notificationData) => {
  try {
    // Get the class and its members
    const classData = await Class.findOne({ classID });
    if (!classData) {
      console.error(`Class ${classID} not found`);
      return;
    }

    console.log(`Found class: ${classID} with ${classData.members.length} members`);

    // Get faculty name - try to find by userID first, then by schoolID, then by _id
    let faculty = await User.findOne({ userID: classData.facultyID });
    if (!faculty) {
      faculty = await User.findOne({ schoolID: classData.facultyID });
    }
    if (!faculty) {
      faculty = await User.findById(classData.facultyID);
    }
    const facultyName = faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Unknown Faculty';

    console.log(`Faculty: ${facultyName}`);

    // Create notifications for all students in the class
    const notifications = [];
    for (const memberId of classData.members) {
      // Skip if the member is the faculty (they don't need notifications for their own posts)
      if (memberId === classData.facultyID) {
        console.log(`Skipping faculty member: ${memberId}`);
        continue;
      }

      // Check if the member is a student - try to find by userID first, then by schoolID, then by _id
      let member = await User.findOne({ userID: memberId });
      if (!member) {
        member = await User.findOne({ schoolID: memberId });
      }
      if (!member) {
        member = await User.findById(memberId);
      }
      
      if (member && member.role === 'students') {
        console.log(`Creating notification for student: ${member.firstname} ${member.lastname} (ID: ${member._id})`);
        const notification = new Notification({
          recipientId: member._id, // Use the actual ObjectId
          faculty: facultyName,
          classID: classID,
          className: classData.className, // Add class name
          classCode: classData.classCode, // Add class code
          ...notificationData
        });
        notifications.push(notification);
      } else {
        console.log(`Member ${memberId} is not a student or not found. Role: ${member?.role}`);
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`Created ${notifications.length} notifications for class ${classID}`);
    } else {
      console.log(`No notifications created for class ${classID}`);
    }
  } catch (error) {
    console.error('Error creating class notifications:', error);
  }
};

// Create notification for announcement
export const createAnnouncementNotification = async (classID, announcement) => {
  const notificationData = {
    type: 'announcement',
    title: 'New Announcement Posted',
    message: `"${announcement.title}" - ${announcement.content.substring(0, 100)}${announcement.content.length > 100 ? '...' : ''}`,
    relatedItemId: announcement._id,
    priority: 'normal'
  };

  await createClassNotifications(classID, notificationData);
};

// Create notification for assignment
export const createAssignmentNotification = async (classID, assignment) => {
  const notificationData = {
    type: 'assignment',
    title: 'New Assignment Available',
    message: `"${assignment.title}" - ${assignment.description ? assignment.description.substring(0, 100) : 'New assignment posted'}${assignment.description && assignment.description.length > 100 ? '...' : ''}`,
    relatedItemId: assignment._id,
    priority: assignment.priority || 'high'
  };

  await createClassNotifications(classID, notificationData);
};

// Create notification for quiz
export const createQuizNotification = async (classID, quiz) => {
  const notificationData = {
    type: 'quiz',
    title: 'New Quiz Available',
    message: `"${quiz.title}" - ${quiz.description ? quiz.description.substring(0, 100) : 'New quiz posted'}${quiz.description && quiz.description.length > 100 ? '...' : ''}`,
    relatedItemId: quiz._id,
    priority: 'high'
  };

  await createClassNotifications(classID, notificationData);
};

// Create notification for activity (general)
export const createActivityNotification = async (classID, activity) => {
  const notificationData = {
    type: 'activity',
    title: 'New Activity Posted',
    message: `"${activity.title}" - ${activity.description ? activity.description.substring(0, 100) : 'New activity available'}${activity.description && activity.description.length > 100 ? '...' : ''}`,
    relatedItemId: activity._id,
    priority: 'normal'
  };

  await createClassNotifications(classID, notificationData);
}; 