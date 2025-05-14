import AuditLog from '../server/models/AuditLog.js';

const auditLogger = (action, details) => {
  return async (req, res, next) => {
    // Store the original end function
    const originalEnd = res.end;

    // Override the end function
    res.end = async function (chunk, encoding) {
      // Restore the original end function
      res.end = originalEnd;

      // Call the original end function
      res.end(chunk, encoding);

      try {
        // Only log successful requests
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ipAddress = req.ip || req.connection.remoteAddress;
          
          const newLog = new AuditLog({
            userId: req.user._id,
            userName: `${req.user.firstname} ${req.user.lastname}`,
            action,
            details: typeof details === 'function' ? details(req) : details,
            ipAddress
          });

          await newLog.save();
        }
      } catch (error) {
        console.error('Error creating audit log:', error);
      }
    };

    next();
  };
};

export default auditLogger; 