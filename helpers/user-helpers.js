const db = require('../config/connection')
const collection = require('../config/collection')
const bcrypt = require('bcrypt');
const { USER_COLLECTION, CART_COLLECTION, PRODUCT_COLLECTION, WISHLIST_COLLECTION, ORDERS_COLLECTION, ADDRESS_COLLECTION, COUPON_COLLECTION } = require('../config/collection');
const { ObjectId } = require('mongodb');
const { resolve } = require('express-hbs/lib/resolver');
const Razorpay = require('razorpay');
const { response } = require('express');
const instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});



module.exports = {

    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                userData.block = true
                userData.password = await bcrypt.hash(userData.password, 10)
                userData.cpassword = null
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    resolve(data.insertedId)
                })
            } catch (err) {
                reject(err)
            }
        })
    },


    existingUser: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email, phone: userData.phone })
                if (user) {
                    resolve({ status: false })
                } else {
                    resolve({ status: true })
                }
            } catch (err) {
                reject(err)
            }
        })
    },


    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
           try{
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email, block: true })
            let blockUser = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email, block: false })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        resolve({ status: false })
                    }
})
            } else if (blockUser) {
                response.blockStatus = true
                response.status = false
                resolve(response)
            } else {
                resolve({ status: false })
            }
           }catch(err){
            reject(err)
           }
        })
    },

    forgotPassword: (emailId) => {
        return new Promise(async (resolve, reject) => {
            try{
                let userData = await db.get().collection(USER_COLLECTION).findOne(emailId)
            console.log(userData);
            console.log(userData.phone);
            if (userData) {
                let phone = userData.phone
                resolve(phone)
            } else {
                resolve({ status: false })
            }
            }catch(err){
                reject(err)
            }
        })
    },

    updatePassword: (data, Email) => {
        return new Promise(async (resolve, reject) => {

            let Password = await bcrypt.hash(data.password, 10)
            data.cpassword = null
            db.get().collection(USER_COLLECTION).updateOne
                ({ email: Email.email }, {
                    $set: {
                        password: Password
                    }
                }).then(() => {
                    resolve(response)
                })

        })

    },

addToCart: (proId, userId) => {
 let proObj = {
            item: ObjectId(proId),
            quantity: 1,
            "status": 'placed',
            "placed": true,
            "shipped": false,
            "delivered": false,
            "cancelled": false
        }

        return new Promise(async (resolve, reject) => {
            try{
                let userCart = await db.get().collection(CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (userCart) {
                let productExist = userCart.products.findIndex(product => product.item == proId)
                if (productExist != -1) {
                    db.get().collection(CART_COLLECTION)
                        .updateOne({ user: ObjectId(userId), 'products.item': ObjectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {

                    db.get().collection(CART_COLLECTION).
                        updateOne({ user: ObjectId(userId) },
                            { $push: { products: proObj } }).then((response) => {
                                resolve()
                            })

                }

            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
            }catch(err){
                reject(err)
            }
        })
    },




    // getCartProducts: (userId) => {
    //     console.log(userId);
    //     return new Promise(async (resolve, reject) => {
    //         let response = {}
    //         let cartItems = await db.get().collection(CART_COLLECTION).aggregate([
    //             {
    //                 $match: { user: ObjectId(userId) }
    //             },
    //             {
    //                 $unwind: '$products'
    //             },
    //             {
    //                 $project: {
    //                     item: '$products.item',
    //                     quantity: '$products.quantity'
    //                 }
    //             },
    //             {
    //                 $lookup: {
    //                     from: PRODUCT_COLLECTION,
    //                     localField: 'item',
    //                     foreignField: '_id',
    //                     as: 'product'
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
    //                 }
    //             },
    //             {
    //                 $addFields: {
    //                     productTotal: {
    //                         $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.price' }]
    //                     }
    //                 }
    //             }
    //         ]).toArray()
    //         console.log(cartItems);

    //         if (cartItems.length > 0) {
    //             response.cartItems = cartItems
    //             resolve(response)

    //         } else {
    //             response.cartEmpty = true
    //             resolve(response)
    //         }
    //     })
    // },

    getCartProducts: (userid) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            console.log('===================1');
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $addFields: {
                        productTotal: {
                            $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.price' }]
                        }
                    }
                }

            ]).toArray()
console.log('--------------------------------2');
            console.log(cartItems);



            if (cartItems.length > 0) {
                // response.cartItems = true
                response.cartItems = cartItems
                resolve(response)

            } else {
                response.cartEmpty = true
                resolve(response)
            }

        })
    },

    cartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
                let count = 0
            let cart = await db.get().collection(CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
            }catch(err){
                reject(err)
            }
        })
    },

    changeProductQuantity: (data) => {
        data.count = parseInt(data.count)
        data.quantity = parseInt(data.quantity)
        return new Promise((resolve, reject) => {
           try{
            if (data.count == -1 && data.quantity == 1) {
                db.get().collection(CART_COLLECTION)
                    .updateOne({ _id: ObjectId(data.cart) },
                        {
                            $pull: { products: { item: ObjectId(data.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(CART_COLLECTION)
                    .updateOne({ _id: ObjectId(data.cart), 'products.item': ObjectId(data.product) },
                        {
                            $inc: { 'products.$.quantity': data.count }
                        }
                    ).then((response) => {
                        resolve({ status: true })

                        // resolve({status:true})
                    })
            }
           }catch(err){
            reject(err)
           }


        })
    },

    removeCartProduct: (data) => {
        return new Promise((resolve, reject) => {
           try{
            db.get().collection(CART_COLLECTION)
            .updateOne({ _id: ObjectId(data.cart) },
                {
                    $pull: { products: { item: ObjectId(data.product) } }
                }
            ).then((response) => {
                resolve({ removeProduct: true })
            })
           }catch(err){
            reject(err)
           }
        })
    },


addToWishlist: (proId, userId) => {

        let proObj = {
            item: ObjectId(proId)
        }

        return new Promise(async (resolve, reject) => {
            try{
                let userWishlist = await db.get().collection(WISHLIST_COLLECTION).findOne({ user: ObjectId(userId) })

                if (userWishlist) {
    
                    let productExist = userWishlist.products.findIndex(product => product.item == proId)
    
                    if (productExist != -1) {
                        console.log('exist');
                        db.get().collection(WISHLIST_COLLECTION)
                            .updateOne({ user: ObjectId(userId) },
                                {
                                    $pull: { products: { item: ObjectId(proId) } }
                                }
    
                            ).then(() => {
                                resolve({ status: false })
                            })
    
                    } else {
    
                        db.get().collection(WISHLIST_COLLECTION).
                            updateOne({ user: ObjectId(userId) },
                                { $push: { products: proObj } }).then((response) => {
                                    resolve({ status: true })
                                })
    
                    }
                } else {
                    let wishListObj = {
                        user: ObjectId(userId),
                        products: [proObj]
                    }
    
                    db.get().collection(WISHLIST_COLLECTION).
                        insertOne(wishListObj).then((response) => {
                            resolve({ status: true })
                        })
    
                }
            }catch(err){
                reject(err)
            }
})
    },

    getWishlistItems: (userId) => {
        return new Promise(async (resolve, reject) => {
           try{
            let wishlistItems = await db.get().collection(WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: { item: '$products.item' }
                },
                {
                    $lookup: {
                        from: PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()

            resolve(wishlistItems)
           }catch(err){
            reject(err)
           }
        })
    },

    removeWishlistProduct: (data) => {
        return new Promise((resolve, reject) => {
            try{
                db.get().collection(WISHLIST_COLLECTION)
                .updateOne({ _id: ObjectId(data.wishlist) },
                    {
                        $pull: { products: { item: ObjectId(data.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
            }catch(err){
                reject(err)
            }
        })
    },

    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
                let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
    
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.price' }] } }
                        }
                    }
                ]).toArray()
                if (total[0]) {
                    resolve(total[0].total)
                } else {
                    resolve()
                }
            }catch(err){
                reject(err)
            }


        })
    },


    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
          try{
            let cart = await db.get().collection(CART_COLLECTION).findOne({ user: ObjectId(userId) })
            resolve(cart.products)
          }catch(err){
            reject(err)
          }
        })

    },

    placeOrder: (orders, products, totalAmount,coupen,userId) => {

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

        return new Promise((resolve, reject) => {
            try{
                let status = orders['payment-method'] == 'COD' ? 'placed' : 'pending'
            let OrderObj = {
                deliveryDetails: {
                    name: orders.name,
                    buildingName: orders.buildingname,
                    city: orders.city,
                    postcode: orders.postcode,
                    phone: orders.phone,
                    email: orders.email,
                    totalAmount:orders.GrandTotal,
                    discountPercentage:parseInt(orders.percentage),
                    discount:parseInt(orders.discount),
                },
                userId: ObjectId(orders.userId),
                paymentMethod: orders['payment-method'],
                products: products,
                status: status,
                date: formatDate(new Date()),
                time: new Date().getTime(),
                totalAmount:totalAmount,



            }

            db.get().collection(ORDERS_COLLECTION).insertOne(OrderObj).then((response) => {

                db.get().collection(CART_COLLECTION).deleteOne({ user: ObjectId(orders.userId) })
                resolve(response.insertedId)
            })
            if(coupen){
                db.get().collection(COUPON_COLLECTION).updateOne({code:coupen.code},
                    {
                        $push:{'users':ObjectId(userId)}
                    }
                    )
            }
            }catch(err){
                reject(err)
            }
        })
    },

    myOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
                let myOrders = await db.get().collection(ORDERS_COLLECTION).aggregate([


                    {
                        '$match': {
                            'userId': ObjectId(userId)
                        }
                    }, {
                        '$unwind': {
                            'path': '$products'
                        }
                    }, {
                        '$lookup': {
                            'from': 'products',
                            'localField': 'products.item',
                            'foreignField': '_id',
                            'as': 'productDetails'
                        }
                    }, {
                        '$project': {
                            'deliveryDetails': 1,
                            'paymentMethod': 1,
                            'date': 1,
                            'time': 1,
                            'status': 1,
                            'products': 1,
                            'productDetails': 1
                        }
                    },
                    {
                        $unwind: '$productDetails'
                    },
                    
                    {
                        $project: {
                            'deliveryDetails': 1,
                            'paymentMethod': 1,
                            'date': 1,
                            'time': 1,
                            'status': 1,
                            'products': 1,
                            'productDetails': 1,
                            'productTotal':1
                        }
                    },
                    {
                        '$addFields': {
                            'Total': {
                                '$sum': {
                                    '$multiply': [
                                        '$products.quantity', { $toInt: '$productDetails.price' }
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $sort: { time: -1 }
                    }
    
    
    
                ]).toArray()
    
                resolve(myOrders)
            }catch(err){
                reject(err)
            }

        })
    },

    orderDetails: (proId, orderId) => {

        return new Promise(async (resolve, reject) => {
           try{
            let order = await db.get().collection(ORDERS_COLLECTION).aggregate([

                {
                    '$match': {
                        '_id': ObjectId(orderId)
                    }
                }, {
                    '$unwind': {
                        'path': '$products'
                    }
                }, {
                    '$match': {
                        'products.item': ObjectId(proId)
                    }
                }, {
                    '$project': {
                        'paymentMethod': 1,
                        'products': 1,
                        'date': 1,
                        'status': 1,
                        'placed': 1,
                        'shipped': 1,
                        'delivered': 1
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
                    '$project': {
                        '_id': 1,
                        'paymentMethod': 1,
                        'products.quantity': 1,
                        'products.status': 1,
                        'products.placed': 1,
                        'products.shipped': 1,
                        'products.delivered': 1,
                        'products.deliveryDate': 1,
                        'products.cancelled': 1,
                        'date': 1,
                        'productDetails': 1,
                        'status': 1,

                    }
                }


            ]).toArray()


            resolve(order[0])
           }catch(err){
            reject(err)
           }
        })
    },

    generateRazorPay: (orderId, total) => {
        return new Promise((resolve, reject) => {

         try{
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log(order);
                resolve(order)
            });
         }catch(err){
            reject(err)
         }

        })
    },

    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
           try{
            const crypto = require("crypto");
            let hmac = crypto.createHmac('sha256', 'eg1fNzfesls7NPsStC0Vspuc')
            hmac.update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
           }catch(err){
            reject(err)
           }

        })
    },

    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            try{
                db.get().collection(ORDERS_COLLECTION).updateOne(
                    { _id: ObjectId(orderId) },
                    { $set: { status: 'placed' } }
                ).then(() => {
                    resolve()
                })
            }catch(err){
                reject(err)
            }
        })
    },

    getUserData: (userId) => {
        return new Promise(async (resolve, reject) => {
           try{
            let user = await db.get().collection(USER_COLLECTION).findOne({ _id: ObjectId(userId) })
            resolve(user)
           }catch(err){
            reject(err)
           }
        })
    },

    updateProfile: (data, userId) => {
        if (data.gender === 'male') {
            Radio = true
        } else {
            Radio = false
        }
        return new Promise((resolve, reject) => {
           try{
            db.get().collection(USER_COLLECTION).updateOne(
                { _id: ObjectId(userId) },
                {
                    $set: {
                        name: data.name,
                        userAddress: data.address,
                        gender: data.gender,
                        radio: Radio
                    }
                }
            )

            resolve()
           }catch(err){
            reject(err)
           }


        })
    },

    addAddress: async (data, userId) => {
        let addressObj = {
            name: data.name,
            buildingName: data.buildingName,
            city: data.city,
            postcode: data.postcode,
            phone: data.phone,
            email: data.email,
            code: Date.now()
        }
        return new Promise(async (resolve, reject) => {
            try{
                let userAddress = await db.get().collection(ADDRESS_COLLECTION).findOne({ user: ObjectId(userId) })
            if (userAddress) {
                db.get().collection(ADDRESS_COLLECTION).
                    updateOne({ user: ObjectId(userId) },
                        { $push: { address: addressObj } }).then((response) => {
                            resolve()
                        })

            } else {
                let Obj = {
                    user: ObjectId(userId),
                    address: [addressObj]
                }
                db.get().collection(ADDRESS_COLLECTION).insertOne(Obj).then(() => {
                    resolve()
                })
            }
            }catch(err){
                reject(err)
            }
        })



    },

    getUserAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
           try{
            let address = await db.get().collection(ADDRESS_COLLECTION).findOne({ user: ObjectId(userId) })
            resolve(address)
           }catch(err){
            reject(err)
           }
        })
    },

    cancelOrder: (orderId, proId) => {
        return new Promise(async (resolve, reject) => {
            try{
                let product = await db.get().collection(ORDERS_COLLECTION).updateOne(
                    { _id: ObjectId(orderId), 'products.item': ObjectId(proId) }, {
                    $set: {
                        "products.$.cancelled": true,
                        "products.$.placed": false,
                        "products.$.shipped": false,
                        "products.$.delivered": false,
                        "products.$.status": 'cancelled',
    
                    }
                }
                )
                resolve(product)
            }catch(err){
                reject(err)
            }

        })
    },

    










}

