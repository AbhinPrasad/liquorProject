var express = require('express');
const adminHelperss = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers')
const productHelpers = require('../helpers/product-helpers');
const { resolve } = require('express-hbs/lib/resolver');
const adminHelpers = require('../helpers/admin-helpers');
const router = express.Router();
const verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next()
  } else {
    res.redirect('/admin')
  }
}


// Admin Login
router.get('/', async function (req, res, next) {
  try {
    if (req.session.adminLoggedIn) {
      let delivery = {}
      delivery.pending = 'pending'
      delivery.Placed = 'placed'
      delivery.Shipped = 'shipped'
      delivery.Delivered = 'delivered'
      delivery.Cancelled = 'cancelled'
      const allData = await Promise.all
        ([
          adminHelpers.onlinePaymentCount(),
          adminHelpers.totalUsers(),
          adminHelpers.totalOrder(),
          adminHelpers.cancelOrder(),
          adminHelpers.totalCOD(),
          adminHelpers.totalDelivered(),
          adminHelpers.totalDeliveryStatus(delivery.Placed),
          adminHelpers.totalDeliveryStatus(delivery.Shipped),
          adminHelpers.totalDeliveryStatus(delivery.Delivered),
          adminHelpers.totalDeliveryStatus(delivery.Cancelled),
        ])
      res.render('admin2/index', {
        layout: 'admin2-layout', admin2: true,

        OnlinePaymentcount: allData[0],
        totalUser: allData[1],
        totalOrder: allData[2],
        cancelOrder: allData[3],
        totalCod: allData[4],
        totalDelivered: allData[5],
        Placed: allData[6],
        Shipped: allData[7],
        Delivered: allData[8],
        Cancelled: allData[9]

      })
    } else {
      res.render('admin2/adminlogin', { loginErr: req.session.loginErr })
      req.session.loginErr = false
    }
  } catch (err) {
    next(err)
  }
});



router.post('/adminlogin', (req, res, next) => {
  try {
    adminHelperss.adminLogin(req.body).then((response) => {
      if (response.status) {
        req.session.adminLoggedIn = true
        req.session.admin = response.admin
        res.redirect('/admin')
      } else {
        req.session.loginErr = "Invalid email or password"
        res.redirect('/admin')
      }

    })
  } catch (err) {
    next(err)
  }
})


// Admin Logout
router.get('/logout', (req, res, next) => {
  try {
    req.session.destroy()
    res.redirect('/admin')
  } catch (err) {
    next(err)
  }
})

// User details
router.get('/userdetails', verifyLogin, (req, res, next) => {
  try {
    adminHelperss.getAllUsers().then((userdetails) => {
      res.render('admin2/userData', { layout: 'admin2-layout', admin2: true, userdetails })
    })
  } catch (err) {
    next(err)
  }
})

// Block User
router.get('/block/:id', verifyLogin, (req, res, next) => {
  try {
    adminHelperss.blockUsers(req.params.id).then(() => {
      res.redirect('/admin/userdetails')
    })
  } catch (err) {
    next(err)
  }
})

// Unblock User
router.get('/unblock/:id', verifyLogin, (req, res, next) => {
  try {
    adminHelperss.unblockUsers(req.params.id).then(() => {
      res.redirect('/admin/userdetails')
    })
  } catch (err) {
    next(err)
  }
})

// Product details
router.get('/productdetails', verifyLogin, (req, res, next) => {
  try {
    productHelpers.getAllProducts().then((products) => {
      productHelpers.viewCategory().then((category) => {
        res.render('admin2/productData', { layout: 'admin2-layout', admin2: true, products, category })
      })
    })
  } catch (err) {
    next(err)
  }
})

router.post('/addproducts', verifyLogin, (req, res, next) => {
  try {
    productHelpers.addProduct(req.body).then((id) => {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/productdetails')
        } else {
          console.log(err);
        }
      })
    })
  } catch (err) {
    next(err)
  }
})

//Edit product
router.get('/editproduct/:id', verifyLogin, (req, res, next) => {
  try {
    productHelpers.editProduct(req.params.id).then((products) => {
      productHelpers.viewCategory().then((category) => {
        res.render('admin2/editProduct', { products, layout: 'admin2-layout', admin2: true, category })
      })
    })
  } catch (err) {
    next(err)
  }
})

router.post('/editproducts/:id', verifyLogin, (req, res, next) => {
  try {
    productHelpers.updateProduct(req.params.id, req.body).then(() => {
      let image = req.files.Image
      let id = req.params.id
      image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/productdetails')
        } else {
          console.log(err);
        }
      })
    })
  } catch (err) {
    next(err)
  }
})

// Delete product
router.get('/deleteproduct/:id', verifyLogin, (req, res, next) => {
  try {
    productHelpers.deleteProduct(req.params.id).then(() => {
      res.redirect('/admin/productdetails')
    })
  } catch (err) {
    next(err)
  }
})

//View Category
router.get('/category', verifyLogin, (req, res, next) => {
  try {
    productHelpers.viewCategory().then((category) => {
      res.render('admin2/category', { layout: 'admin2-layout', admin2: true, category, categoryErr: req.session.categoryErr })
      req.session.categoryErr = false
    })
  } catch (err) {
    next(err)
  }
})

//Add Category
router.post('/addcategory', verifyLogin, (req, res, next) => {
  try {
    productHelpers.existingCategory(req.body).then((response) => {
      if (response.status) {
        productHelpers.addCategory(req.body).then(() => {
          res.redirect('/admin/category')
        })
      } else {
        req.session.categoryErr = "Category already exists"
        res.redirect('/admin/category')
      }
    })
  } catch (err) {
    next(err)
  }
})

//Delete category
router.get('/deletecategory/:id', verifyLogin, (req, res, next) => {
  try {
    productHelpers.deleteCategory(req.params.id).then(() => {
      res.redirect('/admin/category')
    })
  } catch (err) {
    next(err)
  }
})

//View orders
router.get('/viewOrders', verifyLogin, async (req, res, next) => {
  try {
    orders = await adminHelperss.viewOrders()
    orderId = req.session.orderId
    orderStatus = await adminHelperss.viewStatus()
    res.render('admin2/orders', { layout: 'admin2-layout', admin2: true, orders, orderStatus })
  } catch (err) {
    next(err)
  }
})

//Change status
router.get('/changeStatus/:id/:pd/:status', verifyLogin, (req, res, next) => {
  try {
    req.session.orderId = req.params.id
    adminHelperss.changeStatus(req.params.id, req.params.pd, req.params.status).then(() => {
      res.redirect('/admin/viewOrders')
    })
  } catch (err) {
    next(err)
  }
})

//Cancel order
router.get('/cancelOrder/:id/:pd', verifyLogin, (req, res, next) => {
  try {
    userHelpers.cancelOrder(req.params.id, req.params.pd).then(() => {
      res.redirect('back')
    })
  } catch (err) {
    next(err)
  }
})

//view banners
router.get('/viewBanners', verifyLogin, async (req, res, next) => {
  try {
    banner = await adminHelperss.viewBanner()
    res.render('admin2/banners', { admin2: true, layout: 'admin2-layout', banner })
  } catch (err) {
    next(err)
  }
})

//add banner
router.post('/addbanner', verifyLogin, (req, res, next) => {
  try {
    adminHelperss.addBanner(req.body).then((id) => {
      let image = req.files.Image
      image.mv('./public/banner-images/' + id + '.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/banners')
        } else {
          console.log(err);
        }
      })
    })
  } catch (err) {
    next(err)
  }
})

//edit banner
router.get('/editBanner/:id', verifyLogin, async (req, res, next) => {
  try {
    let banner = await adminHelperss.getBannerDetails(req.params.id)
    res.render('admin2/editBanner', { layout: 'admin2-layout', banner, admin2: true })
  } catch (err) {
    next(err)
  }
})

router.post('/editbanner/:id', verifyLogin, (req, res, next) => {
  try {
    adminHelperss.updateBanner(req.body, req.params.id).then(() => {
      if (req.session.adminLoggedIn) {
        let image = req.files.Image;
        console.log("Image ", image)
        let id = req.params.id
        console.log("ID__", req.params.id)
        image.mv('./public/banner-images/' + id + '.jpg', (err, done) => {
          if (!err) {
            res.redirect('/admin/viewBanners')
          } else {
            console.log(err);
          }
        })
      } else {
        res.redirect('/admin')
      }
    })
  } catch (err) {
    next(err)
  }
})



router.post('/addcoupon', (req, res, next) => {
    try{
      adminHelperss.addCoupon(req.body).then((response) => {
        res.redirect('/admin/ViewCoupons')
      })
    }catch(err){
      next(err)
    }
  
})

router.get('/viewCoupons', (req, res, next) => {
 try{
  adminHelpers.viewCoupons().then((coupons) => {
    res.render('admin2/coupons', { layout: 'admin2-layout', admin2: true, coupons })
  })
 }catch(err){
  next(err)
 }
})







module.exports = router;
