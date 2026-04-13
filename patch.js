const fs = require('fs');
let file = fs.readFileSync('frontend/static/js/dashboard.js', 'utf8');

// replace amountPaid verification
const replaceBlock = `
    const seatNumber = document.getElementById('seat_number').value;
    const studentName = document.getElementById('name').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const amountPaid = document.getElementById('amount_paid').value.trim();

    if (!studentName || !mobile || !amountPaid) {
        alert("Name, Mobile, and Amount Paid are mandatory fields.");
        return;
    }

    if (studentName.length < 3) {
        alert("Please enter a valid full name (at least 3 characters).");
        return;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }`;

const newBlock = `
    const seatNumber = document.getElementById('seat_number').value;
    const studentName = document.getElementById('name').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const amountPaidStr = document.getElementById('amount_paid').value.trim();
    const startDate = document.getElementById('start_date').value;

    if (!amountPaidStr) {
        alert("Amount Paid has to be entered.");
        return;
    }
    const amountPaid = parseFloat(amountPaidStr);

    if (!studentName) {
        alert("Name is mandatory.");
        return;
    }
    
    // Name validation: alphabets and spaces only
    const nameRegex = /^[A-Za-z\\s]+$/;
    if (!nameRegex.test(studentName)) {
        alert("Invalid name. Name must contain alphabets only.");
        return;
    }

    if (!mobile) {
        alert("Mobile number is mandatory.");
        return;
    }

    // Mobile validation: exactly 10 digits
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
        alert("Mobile number must be exactly 10 digits.");
        return;
    }
    
    // Date validation
    if (!startDate) {
        alert("Enter the date.");
        return;
    }`;

file = file.replace(replaceBlock, newBlock);
file = file.replace(`const startDate = document.getElementById('start_date').value;
    if (!startDate) {
        alert("Please select a Start Date.");
        return;
    }`, "");

fs.writeFileSync('frontend/static/js/dashboard.js', file);
