 //accountSid, authToken
//  require('dotenv')
const client = require('twilio')(process.env.ACCOUNT_SID,process.env.AUTH_TOKEN);  
const serviceSid =  process.env.SERVICE_SID      

module.exports={
   
    doSms:(userData)=>{
        let res={}
        return new Promise(async(resolve,reject)=>{
           try{
            await client.verify.services(serviceSid).verifications.create({
                to :`+91${userData.phone}`,
                channel:"sms"
            }).then((res)=>{
                res.valid=true;
                resolve(res)
                // console.log(res);
            })
           }catch(err){
            reject(err)
           }
        })
    },
   
    otpVerify:(otpData,userData)=>{
        let resp={}

        return new Promise(async(resolve,reject)=>{
            try{
                await client.verify.services(serviceSid).verificationChecks.create({
                    to:   `+91${userData.phone}`,
                    code:otpData.otp
                }).then((resp)=>{
                     console.log("verification success");
                    resolve(resp)
                })
            }catch(err){
                reject(err)
            }
        })
    },

    // sendOtp:(phone)=>{
    //     let res={}
    //     return new Promise(async(resolve,reject)=>{
    //         await client.verify.services(serviceSid).verifications.create({
    //             to :`+91${phone}`,
    //             channel:"sms"
    //         }).then((res)=>{
    //             res.valid=true;
    //             resolve(res)
    //             // console.log(res);
    //         })
    //     })

    // },
    // confirmOtp:(otpData,phone)=>{
    //     console.log(otpData);
    //     console.log(phone);
    //     let resp={}

    //     return new Promise(async(resolve,reject)=>{
    //         await client.verify.services(serviceSid).verificationChecks.create({
    //             to:   `+91${phone}`,
    //             code:otpData.otp
    //         }).then((resp)=>{
    //              console.log("verification success");
    //             resolve(resp)
    //         })
    //     })
    // },

   

 }
    