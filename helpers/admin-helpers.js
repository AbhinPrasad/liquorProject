const db = require('../config/connection')
const collection = require('../config/collection')
const { USER_COLLECTION, ADMIN_COLLECTION, ORDERS_COLLECTION, BANNER_COLLECTION, COUPON_COLLECTION } = require('../config/collection');
const { ObjectId } = require('mongodb');
const { BulkCountryUpdatePage } = require('twilio/lib/rest/voice/v1/dialingPermissions/bulkCountryUpdate');
const { response } = require('express');
const bcrypt = require('bcrypt');
const { resolve } = require('express-hbs/lib/resolver');
const userHelpers = require('../helpers/user-helpers')





module.exports = {

    adminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = {}
                let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
                if (admin) {

                    bcrypt.compare(adminData.password, admin.password).then((status) => {
                        if (status) {
                            response.admin = admin
                            response.status = true
                            resolve(response)
                        } else {
                            resolve({ status: false })
                        }
                    })
                } else {
                    resolve({ status: false })
                }
            } catch (err) {
                reject(err)
            }

        })
    },

    getAllUsers: (userDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                let userDetails = await db.get().collection(USER_COLLECTION).find().toArray()
                resolve(userDetails)
            } catch (err) {
                reject(err)
            }
        })
    },

    blockUsers: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(USER_COLLECTION).updateOne(
                    { _id: ObjectId(userId) }, {
                    $set: { block: false }
                }).then(() => {
                    resolve()
                })
            } catch (err) {
                reject(err)
            }
        })

    },

    unblockUsers: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(USER_COLLECTION).updateOne(
                    { _id: ObjectId(userId) }, {
                    $set: { block: true }
                }).then(() => {
                    resolve()
                })
            } catch (err) {
                reject(err)
            }
        })
    },

    viewOrders: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let orders = await db.get().collection(ORDERS_COLLECTION).aggregate(
                    [
                        {
                            '$lookup': {
                                'from': 'user',
                                'localField': 'userId',
                                'foreignField': '_id',
                                'as': 'userDetails'
                            }
                        }, {
                            '$unwind': {
                                'path': '$products'
                            }
                        }, {
                            '$unwind': {
                                'path': '$userDetails'
                            }
                        }, {
                            '$lookup': {
                                'from': 'products',
                                'localField': 'products.item',
                                'foreignField': '_id',
                                'as': 'productDetails'
                            }
                        }, {
                            '$unwind': {
                                'path': '$productDetails'
                            }
                        },
                        {
                            $addFields: {
                                totalPrice: { $sum: { $multiply: [{ $toInt: '$products.quantity' }, { $toInt: '$productDetails.price' }] } }
                            }
                        },


                        {
                            '$project': {
                                'paymentMethod': 1,
                                'status': 1,
                                'date': 1,
                                'time': 1,
                                'userId': 1,
                                'products': 1,
                                'userDetails': 1,
                                'productDetails': 1,
                                'totalPrice': 1
                            }
                        },
                        {
                            '$sort': {
                                'time': -1
                            }
                        }
                    ]
                ).toArray()
                resolve(orders)
            } catch (err) {
                reject(err)
            }

        })
    },

    changeStatus: (orderId, proId, status) => {
        return new Promise(async (resolve, reject) => {
            try {
                function formatDate(date) {
                    var d = new Date(date),
                        month = '' + (d.getMonth() + 1),
                        day = '' + d.getDate(),
                        year = d.getFullYear();

                    if (month.length < 2)
                        month = '0' + month;
                    if (day.length < 2)
                        day = '0' + day;

                    return [day, month, year].join('/');
                }
                if (status == 'placed') {
                    db.get().collection(ORDERS_COLLECTION)
                        .updateOne({ _id: ObjectId(orderId), 'products.item': ObjectId(proId) }, {
                            $set: {
                                "products.$.status": 'shipped',
                                "products.$.placed": false,
                                "products.$.shipped": true
                            }
                        })
                    resolve()
                } else {
                    db.get().collection(ORDERS_COLLECTION)
                        .updateOne({ _id: ObjectId(orderId), 'products.item': ObjectId(proId) }, {
                            $set: {
                                "products.$.status": 'delivered',
                                "products.$.delivered": true,
                                "products.$.shipped": false,
                                "products.$.deliveryDate": formatDate(new Date())
                            }
                        })
                    resolve()
                }
            } catch (err) {
                reject(err)
            }
        })
    },

    viewStatus: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let status = await db.get().collection(ORDERS_COLLECTION).find().toArray()
                resolve(status)
            } catch (err) {
                reject(err)
            }
        })
    },

    addBanner: (banner) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(BANNER_COLLECTION).insertOne(banner).then((data) => {
                    resolve(data.insertedId)
                })
            } catch (err) {
                reject(err)
            }
        })
    },

    viewBanner: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let banner = await db.get().collection(BANNER_COLLECTION).find().toArray()
                resolve(banner)

            } catch (err) {
                reject(err)
            }
        })
    },

    getBannerDetails: (bannerId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let bannerData = await db.get().collection(collection.BANNER_COLLECTION).findOne({ _id: ObjectId(bannerId) })
                resolve(bannerData)
            } catch (err) {
                reject(err)
            }
        })
    },

    updateBanner: (data, bannerId) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.BANNER_COLLECTION).updateOne({ _id: ObjectId(bannerId) }, {
                    $set: {
                        name: data.name,
                        description1: data.description1,
                        subDescription: data.subDescription
                    }
                }).then((response) => {
                    resolve()
                })
            } catch (err) {
                reject(err)
            }
        })
    },

    addCoupon: (coupon) => {
        coupon.discount = parseInt(coupon.discount)
        return new Promise((resolve, reject) => {
            db.get().collection(COUPON_COLLECTION).insertOne(coupon).then((data)=>{
                resolve(data)
            })
         
        })
    },

    viewCoupons:()=>{
        return new Promise(async(resolve,reject)=>{
          try{
            let coupon =  await db.get().collection(COUPON_COLLECTION).find().toArray()
            resolve(coupon)
          }catch(err){
            reject(err)
          }
        })
    },

    //dashboard
    onlinePaymentCount: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(ORDERS_COLLECTION).find({ paymentMethod: "ONLINE" }).count()
                resolve(count)
            } catch (err) {
                reject(err)
            }

        })
    },
    totalUsers: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(USER_COLLECTION).find().count()
                resolve(count)
            } catch (err) {
                reject(err)
            }
        })
    },
    totalOrder: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(ORDERS_COLLECTION).find().count()
                resolve(count)
            } catch (err) {
                reject(err)
            }
        })
    },
    cancelOrder: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(ORDERS_COLLECTION).aggregate([
                    {
                        $match: {
                            'products.cancelled': true
                        }
                    },

                    {
                        $unwind: {
                            path: '$products'
                        }
                    }, {
                        $match: {
                            'products.status': 'cancelled'
                        }
                    }, {
                        $count: 'number'
                    }

                ]).toArray()
                resolve(count)
            } catch (err) {
                reject(err)
            }

        })
    },
    totalDelivered: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(ORDERS_COLLECTION).aggregate([
                    {
                        $match: {
                            'products.delivered': true
                        }
                    },

                    {
                        $unwind: {
                            path: '$products'
                        }
                    }, {
                        $match: {
                            'products.status': 'delivered'
                        }
                    }, {
                        $count: 'number'
                    }

                ]).toArray()
                resolve(count)
            } catch (err) {
                reject(err)
            }

        })
    },
    totalCOD: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(ORDERS_COLLECTION).find({ paymentMethod: "COD", }).count()
                resolve(count)
            } catch (err) {
                reject(err)
            }
        })
    },
    totalDeliveryStatus: (data) => {
        return new Promise(async (resolve, reject) => {
            try {
                let statusCount = await db.get().collection(ORDERS_COLLECTION).aggregate([
                    {
                        $match: {
                            status: "placed"
                        }
                    },

                    {
                        $unwind: {
                            path: '$products'
                        }
                    }, {
                        $match: {
                            'products.status': data

                        }
                    }, {
                        $count: 'number'
                    }

                ]).toArray()
                resolve(statusCount)
            } catch (err) {
                reject(err)
            }
        })
    },
    // totalCost: () => {
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             total = await db.get().collection(ORDERS_COLLECTION).aggregate([
    //                 {
    //                     $match: {
    //                         delivarystatus: "pending"
    //                     }
    //                 },

    //                 {
    //                     $project: {
    //                         'delivaryAddress.totalAmount': 1
    //                     }
    //                 },
    //                 {
    //                     $group: {
    //                         _id: null,
    //                         sum: { $sum: '$delivaryAddress.totalAmount' }
    //                     }
    //                 }
    //             ]).toArray()
    //             resolve(total)
    //         } catch (err) {
    //             reject(err)
    //         }
    //     })
    // },

    ApplyCoupen:(coupendata,userId)=>{

        
        return new Promise(async(resolve,reject)=>{
          try{
            let response = {}
            console.log(coupendata,'data')
            let coupen = await db.get().collection(collection.COUPON_COLLECTION).findOne({code:coupendata.code})
            console.log(coupen,'coupon')
            if(coupen){
                let userExist = await db.get().collection(collection.COUPON_COLLECTION).findOne({code:coupendata.code,users:{$in:[ObjectId(userId)]}})
                if(userExist){
                    response.status = false
                    response.coupen = coupen
                    resolve(response)
                }else{
                    response.coupen = coupen
                    response.status = true
                    userHelpers.getTotalAmount(userId).then((total)=>{
                        response.discount = total - ((total * coupen.discount) / 100)
                        response.discountPrice = (total * coupen.discount) / 100
                        resolve(response)
                    })
                }
            }else{
                response.status = false
                resolve(response)
            }
          }catch(err){
            reject(err)
          }

        })

    }

}