import AuditLog from '../models/AuditLog.js';

export const createAuditLog = async (userId, userName, action, details, ipAddress) => {
  try {
    const newLog = new AuditLog({
      userId,
      userName,
      action,
      details,
      ipAddress
    });
    await newLog.save();
    return newLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

export const auditLogMiddleware = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend; // restore original send
      
      // Only log if the request was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const ipAddress = req.ip || req.connection.remoteAddress;
          const details = `${req.method} ${req.originalUrl}`;
          const userName = `${req.user.firstname} ${req.user.lastname}`;
          
          createAuditLog(
            req.user._id,
            userName,
            action,
            details,
            ipAddress
          ).catch(err => console.error('Error creating audit log:', err));
        } catch (error) {
          console.error('Error in audit logging:', error);
        }
      }
      
      return res.send(data);
    };
    
    next();
  };
}; 