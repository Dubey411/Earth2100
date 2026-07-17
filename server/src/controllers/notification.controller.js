const NotificationModel = required('../model/notification.model')

class NotificationController{
    // Create a notification (admin/system)

    static async createNotification(req,res){
      try{
        const {userId, type, title, message,data} = req.body

        if(!userId || !title || !message){
            return res.status(400).json({
                success: false,
                message: 'userid,tite,and mesaage are required'
            })
        }

        const notification = await NotificationModel.create({
            userId,
            type: type || 'system',
            title,
            message,
            data:data || {},
        })

        return res.status(201).json({
            success:true,
            data: notification
        })
      } catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
      }
    }

    // Get all notifications for the authenticated user

    static async getUserNotifications(req,res){
        try{
            const userId = req.user?.uid || req.query.userId;

            if(!userId){
                return res.status(401).json({
                    success:false,
                    message: 'Unauthorized - user ID required'
                })
            }

            const limit = parseInt(req.query.limit) || 50
            const notification = await NotificationModel.getbyUserId(userId,limit)


            return res.json({
                success:true,
                count:notification.length,
                data:notification
            })
        } catch(error){
            return res.status(500).json({
                success:false,
                message:error.message
            })
        }
    }

    // Get unread notification count

    static async getUnreadCount(req,res){
        try{
            const userid = req.user?.uid || req.query.userId
            
            if(!userId){
                return res.status(401).json({
                  success: false,
                  message: 'Unauthorized - user ID required'
                })
            }

            const count = await NotificationModel.getUnreadCount(userid)

            return res.json({
                success: true,
                unreadCount:count,
            })
        } catch (error){
            return res.status(500).json({
                success: false,
                message: error.message
            })
        }
    }

    // Mark Notification as Read

    static async markAsRead(req,res){
        try{
            const {id} = req.parms

            if(!id){
                return res.status(400).Json({
                    success:false,
                    messsage: 'Notification ID is required'
                })
            }

            await NotificationModel.markAsRead(id)

            return res.json({
                success:true,
                message: 'Notification marked as read'
            })      
        } catch(error){
            return res.status(500).json({
                success:false,
                message:error.message
            })
        }
    }

    // Mark all notifications as read

    static async markAllAsRead(req,res){
        try{
            const userId = req.user?.uid || req.body.userId

            if(!userId){
                return res.status(401).json({
                    success:false,
                    message: 'Unauthorized - user ID required'
                })
            }

            await NotificationModel.markAllAsRead(userId)
            return res.json({
                success:true,
                message: 'All notifications marked as read'
            })
        } catch (error){
            return res.status(500).json({
                success:false,
                message: error.message
            })
        }
    }

    // Delete a notification

    static async deleteNotification(req,res){
        try{
            const {id} = req.params

            if(!id){
                return res.status(400).json({
                    success:false,
                    message:'Notification ID is required'
                })
            }

            await NotificationModel.delete(id)
            return res.json({
                success:true,
                message:'notification deleted successfully'
            })
        } catch(error){
            return res.status(500).json({
                success:false,
                message:error.message
            })
        }
    }
    
}

    
