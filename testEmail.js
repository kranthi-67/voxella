require("dotenv").config();

const sendEmail = require("./utils/sendEmail");

async function test() {

    try {

        await sendEmail(

            process.env.EMAIL_USER,

            "VOXELLA Test Email",

            "🎉 Congratulations! Your email system is working."

        );

        console.log("✅ Email sent successfully!");

    } catch (err) {

        console.error(err);

    }

}

test();