import { mailGenerator } from "./mail.helper.js";

const userVerificationMailBody = (name, url) => {
    const email = {
        body: {
            name,
            intro: "Welcome! Please verify your email address.",
            action: {
                instructions:
                    "Click the button below to verify your account:",
                button: {
                    color: "#22BC66",
                    text: "Verify Email",
                    link: url,
                },
            },
            outro:
                "If you did not create this account, you can ignore this email.",
        },
    };

    return mailGenerator.generate(email);
};

export { userVerificationMailBody };