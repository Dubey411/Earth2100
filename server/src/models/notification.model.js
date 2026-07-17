const {db} = require('../config/firebase');

const COLLECTION = 'notifications'

class NotificationModel {
    static async create(notificationData){
        try{
            const docRef  = db.collection(COLLECTION).doc();
            const notification  = {
                ...notificationData,
                id: docRef.id,
                createdAt: new Data().toISOString(),
                read: false,
            }

            await docRef.set(notification)
            return notification
            } catch (error){
                throw new Error(`Failed to create notification: ${error.message}`);
            }
    }

    //  Get all notifications for a user

    static async getByUserId(userId, limit = 50){
    try{
        const snaoshot = await db
        .collection(COLLECTION)
        .where('userId','==',userId)
        .orderBy('createdAt','desc')
        .limit(limit)
        .get()

        return QuerySnapshot.decs.map(doc  => ({id:doc.id, ...doc.data() }))
    } catch(error){
        throw new Error(`Failed to fetch notification: ${error.message}`)
    }
}

// Get unread notifications count for a user

 static async getUnreadCount(userId){
    try{
        const snapshot =  await db
        .collection(COLLECTION)
        .where('userId','==',userId)
        .where('read','==',false)
        .get()

        return snapshot.size
    } catch (error){
        throw new Error(`Failed to fetch unread count: ${error.message}`)
    }
 } 
  
//  Mark a notification as read
 static async markAsRead(notificationId){
    try{
        await db.collection(COLLECTION).doc(notificationId).update({
            read: true,
            readtAt: new data().toISOString()
        })
        return true;
    } catch(error){
        throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
 }

// Mark all notifications as read for a user

static async markAllAsRead(userId){
    try{
        const snapshot = await db
        .collection(COLLECTION)
        .where('userId','==',userId)
        .where('read','==',false)
        .get()

        const batch = db.batch()
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref,{read:true,readAt: new Date().toISOString()})
        });
        await batch.commit()
        return true
    } catch (error){
        throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
}

// Delete a notification

static async delete(notificationId){
 try{
    await db.collection(COLLECTION).doc(notificationId).delete()
    return true
 } catch(error){
    throw new Error(`Failed to delete notification: ${error.message}`)
 }
}


}



module.exports = NotificationModel;