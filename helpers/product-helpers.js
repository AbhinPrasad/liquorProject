const { resolve } = require('express-hbs/lib/resolver');
const { PRODUCT_COLLECTION, CATEGORY_COLLECTION } = require('../config/collection');
const collection = require('../config/collection')
const db = require('../config/connection')
const ObjectId = require('mongodb').ObjectId;



module.exports = {

    addProduct: (product) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
                    console.log(data);
                    resolve(data.insertedId)

                })
            } catch (err) {
                reject(err)
            }

        })

    },

    getAllProducts: (productData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let product = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
                resolve(product)
            } catch (err) {
                reject(err)
            }
        })

    },
    IndexProducts: (productData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let product = await db.get().collection(collection.PRODUCT_COLLECTION).find().limit(8).toArray()
                resolve(product)
            } catch (err) {
                reject(err)
            }
        })

    },

    editProduct: (productId) => {
        return new Promise(async (resolve, reject) => {
          try{
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectId(productId) })
            resolve(product)
          }catch(err){
            reject(err)
          }
        })
    },

    updateProduct: (proId, product) => {
        return new Promise((resolve, reject) => {
            try{
                db.get().collection(PRODUCT_COLLECTION).updateOne({ _id: ObjectId(proId) }, {
                    $set: {
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        category: product.category
    
                    }
                })
                resolve()
            }catch(err){
                reject(err)
            }
        })
    },

    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
           try{
            db.get().collection(PRODUCT_COLLECTION).deleteOne({ _id: ObjectId(proId) })
            resolve()
           }catch(err){
            reject(err)
           }
        })
    },

    addCategory: (category) => {
        return new Promise((resolve, reject) => {
           try{
            db.get().collection(CATEGORY_COLLECTION).insertOne(category)

            resolve()
           }catch(err){
            reject(err)
           }

        })
    },

    viewCategory: () => {
        return new Promise(async (resolve, reject) => {
           try{
            let category = await db.get().collection(CATEGORY_COLLECTION).find().toArray()
            resolve(category)
           }catch(err){
            reject(err)
           }
        })
    },

    existingCategory: (categoryName) => {
        return new Promise(async (resolve, reject) => {
          try{
            let category = await db.get().collection(CATEGORY_COLLECTION).findOne({ name: categoryName.name })
            if (category) {
                resolve({ status: false })
            } else {
                resolve({ status: true })
            }
          }catch(err){
            reject(err)
          }
        })

    },

    deleteCategory: (categoryId) => {
        return new Promise((resolve, reject) => {
           try{
            db.get().collection(CATEGORY_COLLECTION).deleteOne({ _id: ObjectId(categoryId) })
            resolve()
           }catch(err){
            reject(err)
           }
        })
    },

    viewProduct: (proId) => {
        return new Promise((resolve, reject) => {
           try{
            let product = db.get().collection(PRODUCT_COLLECTION).findOne({ _id: ObjectId(proId) })
            resolve(product)
           }catch(err){
            reject(err)
           }
        })
    },

    getProducts: (catName) => {
        return new Promise((resolve, reject) => {
           try{
            let product = db.get().collection(PRODUCT_COLLECTION).find({ category: catName }).toArray()
            resolve(product)

           }catch(err){
            reject(err)
           }
        })
    }







}