const express = require('express');
const session = require('express-session');
const twilio = require('twilio')
const twilioHelpers = require('../helpers/twilio-helpers');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers')
const productHelpers = require('../helpers/product-helpers');
const { resolve } = require('express-hbs/lib/resolver');
const { reservationsUrl } = require('twilio/lib/jwt/taskrouter/util');
const adminHelpers = require('../helpers/admin-helpers');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  try {
    let user = req.session.user
    let products = await productHelpers.IndexProducts()
    let category = await productHelpers.viewCategory()
    let banner = await adminHelpers.viewBanner()
    let cartCount = null
    if (req.session.loggedIn) {
      cartCount = await userHelpers.cartCount(user._id)
      res.render('users/index', { user, layout: 'user-layout', users: true, category, cartCount, products, banner });
    } else {
      res.render('users/index', { layout: 'user-layout', users: true, category, products, banner });
    }
  } catch (err) {
    next(err)
  }
});

// GET login page
router.get('/login', (req, res, next) => {
  try {
    if (req.session.loggedIn) {
      res.redirect('/')
    } else {
      res.render('users/login', { loginErr: req.session.loginErr, layout: 'user-layout' })
      req.session.loginErr = false
    }
  } catch (err) {
    next(err)
  }
})

// POST login and redirecting to user home page
router.post('/login', (req, res, next) => {
  try {
    userHelpers.doLogin(req.body).then((response) => {
      if (response.status) {
        req.session.loggedIn = true
        req.session.user = response.user
        res.redirect('/')
      } else {
        if (response.blockStatus) {
          req.session.loginErr = "Your account is blocked"
          req.session.loggedIn = false
          res.redirect('/login')
        } else {
          req.session.loginErr = "Invalid username or password"
          res.redirect('/login')
        }
      }
    })
  } catch (err) {
    next(err)
  }
})

// Logout
router.get('/logout', (req, res, next) => {
  try {
    req.session.user = null
    req.session.loggedIn = null
    res.redirect('/')
  } catch (err) {
    next(err)
  }
})

// GET signup page
router.get('/signup', (req, res, next) => {
  try {
    if (req.session.loggedIn) {
      res.redirect('/')
    } else {
      res.render('users/signup', { signupErr: req.session.signupErr, layout: 'user-layout' })
      req.session.signupErr = false
    }
  } catch (err) {
    next(err)
  }
})

// Post signup 
router.post('/signup', (req, res, next) => {
  try {
    userHelpers.existingUser(req.body).then((response) => {
      if (response.status) {
        req.session.signUp = true
        req.session.body = req.body
        num = req.body.phone
        number = num.slice(6)
        req.session.number = number
        twilioHelpers.doSms(req.body).then((data) => {
          if (data) {
            res.redirect('/otp')
          } else {
            res.redirect('/signup')
          }
        })
      } else {
        req.session.signupErr = "Email or Phone number already registered"
        res.redirect('/signup')
      }
    })
  } catch (err) {
    next(err)
  }
})

// GET otp verification page
router.get('/otp', (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.redirect('/')
    } else {
      res.render('users/otp', { otpErr: req.session.otpErr, number: req.session.number, layout: 'user-layout' })
      req.session.otpErr = false
    }
  } catch (err) {
    next(err)
  }
})

// OTP verified and redirecting to login page
router.post('/otp', (req, res, next) => {
  try {
    twilioHelpers.otpVerify(req.body, req.session.body).then((response) => {
      if (response.valid) {
        userHelpers.doSignup(req.session.body).then((response) => {
          res.redirect('/login')
        })
      } else {
        req.session.otpErr = "Invalid OTP, Please try again"
        res.redirect('/otp')
      }
    })
  } catch (err) {
    next(err)
  }
})

// router.get('/otps', (req, res, next) => {
//   res.render('users/fp-otp', { otpErr: req.session.otpErr, number: req.session.number, layout: 'user-layout' })
//   req.session.otpErr = false
// })

// //Forgot password
// router.post('/forgotPassword', (req, res, next) => {
//   console.log(req.body);
//   req.session.email = req.body
//   userHelpers.forgotPassword(req.session.email).then((phone) => {
//     console.log(phone);
//     req.session.phone = phone
//     num = req.session.phone
//     number = num.slice(6)
//     req.session.number = number
//     twilioHelpers.sendOtp(phone).then((data) => {
//       res.redirect('/otps')
//     })
//   })
// })

// router.get('/resetPassword', (req, res, next) => {
//   res.render('users/resetPassword', { layout: 'user-layout' })
// })

// router.post('/otps', (req, res, next) => {
//   twilioHelpers.confirmOtp(req.body, req.session.phone).then((response) => {
//     if (response.valid) {
//       res.redirect('/resetPassword')
//     } else {
//       req.session.otpErr = "Invalid OTP, Please try again"
//       res.redirect('/otp')
//     }
//   })
// })

// router.post('/confirmResetPassord', (req, res, next) => {
//   userHelpers.updatePassword(req.body, req.session.email).then(() => {
//     console.log('password changed successfully')
//     res.redirect('/login')
//   })
// })

//Products
router.get('/products', async (req, res, next) => {
  try {
    productHelpers.getAllProducts().then(async (products) => {
      let category = await productHelpers.viewCategory()
      let banner = await adminHelpers.viewBanner()
      user = req.session.user
      let cartCount = null
      if (req.session.loggedIn) {
        cartCount = await userHelpers.cartCount(user._id)
      }
      res.render('users/product', { layout: 'user-layout', users: true, user, products, category, cartCount, banner })
    })
  } catch (err) {
    next(err)
  }
})

//product single-view
router.get('/viewproduct/:id', async (req, res, next) => {
  try {
    user = req.session.user
    let cartCount = null
    let banner = await adminHelpers.viewBanner()
    if (req.session.loggedIn) {
      cartCount = await userHelpers.cartCount(user._id)
    }
    let product = await productHelpers.viewProduct(req.params.id)
    res.render('users/singleProduct', { users: true, layout: 'user-layout', product, user, cartCount, banner })

  } catch (err) {
    next(err)
  }
})

//Products by category
router.get('/getproducts/:name', async (req, res, next) => {
  try {
    user = req.session.user
    let cartCount = null
    if (req.session.loggedIn) {
      cartCount = await userHelpers.cartCount(user._id)
    }
    let category = await productHelpers.viewCategory()
    let banner = await adminHelpers.viewBanner()
    productHelpers.getProducts(req.params.name).then((product) => {
      res.render('users/productCategory', { layout: 'user-layout', users: true, product, category, cartCount, banner })
    })
  } catch (err) {
    next(err)
  }
})


router.get('/cart', async(req, res,next) => {
 try{
  let banner = await adminHelpers.viewBanner()
  
  req.session.coupon = null;
  if(req.session.loggedIn){
    let userCoupon = await adminHelpers.viewCoupons()
    console.log(userCoupon);
     userHelpers.getCartProducts(req.session.user._id).then(async (response) => {
      console.log(response);
      let products = response.cartItems
      let cartEmpty = response.cartEmpty
      let user = req.session.user
      let CartCount = await userHelpers.cartCount(req.session.user._id)
      let totalAmount = 0
      totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
      res.render('users/cart', { layout:'user-layout',totalAmount, products, user: req.session.user, CartCount, cartEmpty,banner, users:true,userCoupon })
    })
  }else{
    res.redirect('/')
  }
 }catch(err){
  next(err)
 }
  

})
//Add to cart
router.get('/addToCart/:id', (req, res, next) => {
  try {
    if (req.session.loggedIn) {
      userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
        console.log('item added');
        res.json({ status: true })
      })
    } else {
      res.json({ status: false })
    }
  } catch (err) {
    next(err)
  }
})

//Cart product quantity
router.post('/change-product-quantity', async (req, res, next) => {
  try {
    userHelpers.changeProductQuantity(req.body).then(async (response) => {
      response.total = await userHelpers.getTotalAmount(req.body.user)
      res.json(response)
    })
  } catch (err) {
    next(err)
  }
})

//Remove product from cart
router.post('/remove-cart-product', (req, res, next) => {
  try {
    userHelpers.removeCartProduct(req.body).then((response) => {
      res.json(response)
    })
  } catch (err) {
    next(err)
  }
})

//Wishlist
router.get('/wishlist', async (req, res, next) => {
  try {
    user = req.session.user
    let category = await productHelpers.viewCategory()
    let cartCount = await userHelpers.cartCount(user._id)
    let products = await userHelpers.getWishlistItems(user._id)
    let banner = await adminHelpers.viewBanner()
    res.render('users/wishlist', { users: true, layout: 'user-layout', user, category, cartCount, products, banner })
  } catch (err) {
    next(err)
  }
})

//Add to wishlist
router.get('/addToWishlist/:id', (req, res, next) => {
  try {
    let p = {}
    userHelpers.addToWishlist(req.params.id, req.session.user._id).then((response) => {
      p.response = response
      res.json(p)
    })
  } catch (err) {
    next(err)
  }
})

//Remove product from wishlist
router.post('/remove-wishlist-product', (req, res, next) => {
  try {
    userHelpers.removeWishlistProduct(req.body).then((response) => {
      res.json(response)
    })
  } catch (err) {
    next(err)
  }
})

//Checkout
router.get('/checkout', verifyLogin, async (req, res, next) => {
  try {
    userAddress = await userHelpers.getUserAddress(req.session.user._id)
    user = req.session.user
    let products = await userHelpers.getCartProducts(user._id)
    let banner = await adminHelpers.viewBanner()
    if (req.session.coupen) {
      let totalAmount = await userHelpers.getTotalAmount(user._id)
      let coupendiscount = req.session.discount
      let discountPrice = req.session.discountprice
      res.render('users/checkout', { user, totalAmount, products, layout: 'user-layout', users: true, coupendiscount, discountPrice, banner, userAddress })
    } else {
      let totalAmount = await userHelpers.getTotalAmount(user._id)
      res.render('users/checkout', { users: true, layout: 'user-layout', user, products, totalAmount, userAddress, banner })
    }
  } catch (err) {
    next(err)
  }
})

//Place Order
router.post('/placeOrder', async (req, res, next) => {
  try {
    let products = await userHelpers.getCartProductList(req.session.user._id)
    let totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
    userHelpers.placeOrder(req.body, products, totalAmount,req.session.coupen,req.session.user._id).then((orderId) => {
      if (req.body['payment-method'] === 'COD') {
        res.json({ codSuccess: true })
      } else {
        userHelpers.generateRazorPay(orderId, req.body.GrandTotal).then((response) => {
          console.log(response);
          res.json(response)
        })
      }
    })
  } catch (err) {
    next(err)
  }
})

//Online Payment
router.post('/verify-payment', (req, res, next) => {
  try {
    userHelpers.verifyPayment(req.body).then(() => {
      userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
        res.json({ status: true })
      })
    }).catch((err) => {
      res.json({ status: false, errMsg: 'payment failed' })
    })
  } catch (err) {
    next(err)
  }
})

//Order Confirmed
router.get('/order-confirmed', verifyLogin, (req, res, next) => {
  try {
    res.render('users/order-success', { layout: 'user-layout' })
  } catch (err) {
    next(err)
  }
})

//My Orders
router.get('/go-to-myOrders', verifyLogin, async (req, res, next) => {
  try {
  user = req.session.user
  let category = await productHelpers.viewCategory()
  let cartCount = await userHelpers.cartCount(user._id)
  myOrders = await userHelpers.myOrders(req.session.user._id)
  let banner = await adminHelpers.viewBanner()
  res.render('users/myOrders', { layout: 'user-layout', users: true, myOrders, cartCount, category, user, banner })
  } catch (err) {
    next(err)
  }
})

//Order Tracking
router.get('/orderTracking/:pd/:id', verifyLogin, async (req, res, next) => {
  try {
    order = await userHelpers.orderDetails(req.params.pd, req.params.id)
    res.render('users/orderTracking', { layout: 'user-layout', order })
  } catch (err) {
    next(err)
  }
})

//Cancel Order
router.get('/cancelOrder/:id/:pd', (req, res, next) => {
  try {
    userHelpers.cancelOrder(req.params.id, req.params.pd).then(() => {
      res.redirect('back')
    })
  } catch (err) {
    next(err)
  }
})

//User Profile
router.get('/profile', verifyLogin, async (req, res, next) => {
  try {
    user = req.session.user
    userProfile = await userHelpers.getUserData(req.session.user._id)
    let banner = await adminHelpers.viewBanner()
    res.render('users/profile', { users: true, user, layout: 'user-layout', userProfile, banner })
  } catch (err) {
    next(err)
  }
})

router.post('/updateProfile', (req, res, next) => {
  try {
    userHelpers.updateProfile(req.body, req.session.user._id).then(() => {
      res.redirect('/profile')
    })
  } catch (err) {
    next(err)
  }
})

router.get('/address', verifyLogin, async (req, res, next) => {
  try {
    let userProfile = await userHelpers.getUserData(req.session.user._id)
    let userAddress = await userHelpers.getUserAddress(req.session.user._id)
    let banner = await adminHelpers.viewBanner()
    res.render('users/address', { layout: 'user-layout', userProfile, userAddress, users: true, banner })
  } catch (err) {
    next(err)
  }
})

router.post('/addAddress', verifyLogin, (req, res, next) => {
  try {
    userHelpers.addAddress(req.body, req.session.user._id).then(() => {
      res.redirect('/address')
    })
  } catch (err) {
    next(err)
  }
})

router.post('/apply-coupen', (req, res) => {
  try{
    console.log(req.body, '  console.log req.body');
  adminHelpers.ApplyCoupen(req.body, req.session.user._id).then((response) => {
    console.log(req.session.user._id)
    if (response.status) {
      req.session.coupen = response.coupen
      req.session.discount = response.discount
      console.log(req.session.discount, ' * * *')
      req.session.discountprice = response.discountPrice
      console.log(req.session.discountprice, '^^^ ^^^ ^^^')
    }
    console.log(req.session.discount, 'discount');
    res.json({ response })
  })
  }catch(err){
    next(err)
  }
})





module.exports = router;
