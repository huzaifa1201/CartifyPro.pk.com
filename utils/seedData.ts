
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { CountryConfig } from "../types";

export const seedMakeCountries = async () => {
    const countries: CountryConfig[] = [
        {
            id: 'pakistan',
            currency: 'PKR',
            branch_fee: 5000,
            payment_methods: ['JazzCash', 'EasyPaisa', 'Bank Transfer'],
            payment_instructions: "Please send PKR 5000 to the following account:\nBank: HBL\nAccount: 1234-5678-9012\nTitle: NexusCart PK"
        },
        {
            id: 'india',
            currency: 'INR',
            branch_fee: 2000,
            payment_methods: ['UPI', 'Paytm', 'Bank Transfer'],
            payment_instructions: "Please pay INR 2000 via UPI to nexus@upi or Bank Transfer."
        },
        {
            id: 'uae',
            currency: 'AED',
            branch_fee: 150,
            payment_methods: ['Bank Transfer', 'Mashreq Neo'],
            payment_instructions: "Transfer AED 150 to IBAN: AE00000000000000."
        }
    ];

    for (const c of countries) {
        await setDoc(doc(db, "countries", c.id), c);
        console.log(`Seeded ${c.id}`);
    }

    // --- Seeding Country-Wise Payment Systems ---
    const { collection, addDoc } = await import("firebase/firestore");

    // 1. Platform Payment Accounts (Branch -> Nexus)
    const platformAccounts = [
        { country: "india", type: "UPI", title: "Nexus India UPI", accountNumber: "nexus@okicici", instructions: "Pay via any UPI app.", enabled: true },
        { country: "pakistan", type: "Bank", title: "Nexus Pak Bank", accountNumber: "PK00HBL12345678", instructions: "Upload receipt after transfer.", enabled: true },
        { country: "uae", type: "Bank", title: "Nexus Dubai Islamic Bank", accountNumber: "AE00123456789", instructions: "Use Reference #BranchID", enabled: true }
    ];

    for (const p of platformAccounts) {
        await addDoc(collection(db, "platform_payment_accounts"), p);
    }

    // 2. Customer -> Branch Allowed Methods (Global Config)
    const localMethods = [
        // India
        { country: "india", name: "UPI", type: "digital", instructions: "Pay to Shop UPI", enabled: true },
        { country: "india", name: "Paytm", type: "digital", instructions: "Paytm Wallet Transfer", enabled: true },
        { country: "india", name: "Google Pay", type: "digital", instructions: "GPay Number", enabled: true },
        // Pakistan
        { country: "pakistan", name: "JazzCash", type: "digital", instructions: "Send to JazzCash Mobile Account", enabled: true },
        { country: "pakistan", name: "EasyPaisa", type: "digital", instructions: "Send to EasyPaisa Account", enabled: true },
        { country: "pakistan", name: "Cash on Delivery", type: "cod", instructions: "Pay cash upon arrival.", enabled: true },
        // UAE
        { country: "uae", name: "Bank Transfer", type: "manual", instructions: "Direct Bank Transfer to Shop IBAN", enabled: true },
        { country: "uae", name: "Cash on Delivery", type: "cod", instructions: "Pay cash upon delivery.", enabled: true },
        { country: "uae", name: "Card on Delivery", type: "cod", instructions: "Pay by card machine upon delivery.", enabled: true }
    ];

    for (const l of localMethods) {
        await addDoc(collection(db, "country_local_payment_methods"), l);
    }

    alert("System Seeded: Countries, Platform Accounts, Local Methods!");
};
