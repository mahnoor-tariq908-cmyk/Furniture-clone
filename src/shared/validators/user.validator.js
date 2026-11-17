import { z } from "zod";


// ==========================================
// REGISTER VALIDATION
// ==========================================

const registerSchema = z.object({

    userName: z.string().min(2),

    userEmail: z.string().email(),

    userPassword: z.string().min(8),

    userRole: z
        .enum(["admin", "user"])
        .optional(),

});


// ==========================================
// LOGIN VALIDATION
// ==========================================

const loginSchema = z.object({

    userEmail: z.string().email(),

    userPassword: z.string().min(1),

});


// ==========================================
// EXPORT
// ==========================================

export {
    registerSchema,
    loginSchema
};