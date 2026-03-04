from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
import os
import time
from datetime import datetime

def draw_receipt_copy(c, start_y, is_student_copy, student_data, timestamp, width):
    """
    Draws a single copy of the receipt starting at `start_y` and going downwards.
    `start_y` is the top edge for this copy.
    """
    margin = 40
    # Copy Type Label
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(HexColor("#666666"))
    copy_text = "STUDENT COPY" if is_student_copy else "ADMIN COPY"
    c.drawString(margin, start_y - 20, copy_text)
    
    # Generate Smart Receipt Number if not provided
    # Format: YYYYMMDD-PLAN_DAYS
    date_str = datetime.now().strftime("%Y%m%d")
    plan_days = student_data.get('days', '30') 
    receipt_no = f"{date_str}-{plan_days}M" if plan_days == '30' or plan_days == '90' else f"{date_str}-{plan_days}D" # Fallback formatting
    
    if plan_days == '30':
        receipt_no = f"{date_str}-1M"
    elif plan_days == '90':
        receipt_no = f"{date_str}-3M"
        
    is_dues_clearance = student_data.get('is_dues_clearance', False)
    if is_dues_clearance:
        receipt_no = f"{date_str}-DUES"
        
    c.drawRightString(width - margin, start_y - 20, f"Receipt No: {receipt_no}")
    
    # Header: CHAMPIONS
    header_y = start_y - 55
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(HexColor("#1e3a8a")) # Dark blue
    c.drawString(margin, header_y, "CHAMPIONS")
    
    # Tagline: a premium self study Space
    c.setFont("Helvetica-Oblique", 13)
    c.setFillColor(HexColor("#475569"))
    c.drawRightString(width - margin, header_y, "a premium self study Space")
    
    # Subheader: study room | Library
    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor("#334155"))
    c.drawString(margin, header_y - 15, "study room | Library")
    
    # Add Address, Phone, Email
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor("#64748b"))
    c.drawString(margin, header_y - 30, "Nana Chowk, Khumbare Nagar, Gondia-441601")
    c.drawString(margin, header_y - 42, "Call/WhatsApp: 9359908463 / 9011102973 | Email: championsedu.jeeneet@gmail.com")
    
    # Horizontal line separator
    c.setStrokeColor(HexColor("#cbd5e1"))
    c.setLineWidth(1)
    c.line(margin, header_y - 52, width - margin, header_y - 52)
    
    # Student Details Section
    details_y = header_y - 75
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(HexColor("#0f172a"))
    c.drawString(margin, details_y, "Student Details")
    
    c.setFont("Helvetica", 11)
    c.setFillColor(HexColor("#334155"))
    
    # Two-column layout for details
    col1_x = margin + 10
    col2_x = width / 2 + 10
    line_height = 20
    
    # Data prep
    name = student_data.get('student_name', 'N/A')
    phone = student_data.get('mobile', 'N/A')
    seat = student_data.get('seat_number', 'N/A')
    start_date = student_data.get('start_date', 'N/A')
    end_date = student_data.get('end_date', 'N/A')
    
    # Row 1
    c.drawString(col1_x, details_y - line_height, f"Name: {name}")
    c.drawString(col2_x, details_y - line_height, f"Phone: {phone}")
    # Row 2
    c.drawString(col1_x, details_y - 2*line_height, f"Seat: {seat}")
    # Leave col2_x blank or omit in Row 2
    # Row 3
    c.drawString(col1_x, details_y - 3*line_height, f"Start Date: {start_date}")
    c.drawString(col2_x, details_y - 3*line_height, f"Due Date: {end_date}")
    
    # Amount Details Section
    amount_y = details_y - 3*line_height - 30
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(HexColor("#0f172a"))
    c.drawString(margin, amount_y, "Payment Details")
    
    # Amount box background
    box_y = amount_y - 80
    c.setFillColor(HexColor("#f8fafc"))
    c.setStrokeColor(HexColor("#e2e8f0"))
    c.roundRect(margin, box_y, width - 2*margin, 70, 4, fill=1, stroke=1)
    
    c.setFont("Helvetica", 11)
    c.setFillColor(HexColor("#1e293b"))
    
    total = student_data.get('total_amount', '0')
    paid = student_data.get('amount_paid', '0')
    pending = student_data.get('pending_balance', '0')
    current_payment = student_data.get('current_payment', '0')
    
    payment_mode = student_data.get('payment_mode', 'Offline')
    
    if is_dues_clearance:
        c.drawString(margin + 20, box_y + 45, f"Amount Clearing Now: Rs. {current_payment}")
        c.drawString(margin + 20, box_y + 25, f"Total Paid Over Time: Rs. {paid} / {total}")
    else:
        c.drawString(margin + 20, box_y + 45, f"Total Amount: Rs. {total}")
        c.drawString(margin + 20, box_y + 25, f"Amount Paid: Rs. {paid} ({payment_mode})")
    
    c.setFont("Helvetica-Bold", 11)
    if float(pending) > 0:
        c.setFillColor(HexColor("#ef4444")) # Red if pending
    else:
        c.setFillColor(HexColor("#10b981")) # Green if clear
    c.drawString(margin + 20, box_y + 5, f"Pending Amount: Rs. {pending}")
    
    # Footer: Signatures
    footer_y = box_y - 50
    c.setStrokeColor(HexColor("#94a3b8"))
    c.line(margin, footer_y, margin + 120, footer_y)
    c.line(width - margin - 120, footer_y, width - margin, footer_y)
    
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#64748b"))
    c.drawString(margin + 40, footer_y - 15, "Stamp")
    c.drawString(width - margin - 110, footer_y - 15, "Admin Signature")
    
    # Thank you note
    c.setFont("Helvetica-Oblique", 11)
    c.setFillColor(HexColor("#0f172a"))
    c.drawCentredString(width / 2, footer_y - 40, "Thanks for subscribing to the champions library!")

def generate_receipt(student_data, target_directory):
    """
    Generates a professional dual-copy A4 PDF receipt.
    """
    if not os.path.exists(target_directory):
        os.makedirs(target_directory)
        
    safe_name = student_data.get('student_name', 'Student').replace(" ", "_")
    timestamp = int(time.time())
    
    # Adding a date string to the filename as well for clarity
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"Receipt_{safe_name}_{date_str}_{timestamp}.pdf"
    filepath = os.path.join(target_directory, filename)
    
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    
    # Calculate half page height
    half_height = height / 2.0
    
    # Draw Student Copy (Top Half)
    draw_receipt_copy(c, height, is_student_copy=True, student_data=student_data, timestamp=timestamp, width=width)
    
    # Draw dashed cut line in the middle
    c.setStrokeColor(HexColor("#cbd5e1"))
    c.setDash(6, 3)
    c.line(0, half_height, width, half_height)
    
    # Draw Scissors icon (text approximation)
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#94a3b8"))
    c.drawCentredString(width / 2, half_height - 3, "--------------------------------------------- Cut Here ---------------------------------------------")
    c.setDash(1, 0) # Reset dash
    
    # Draw Admin Copy (Bottom Half)
    # Give it a tiny margin from the cut line
    draw_receipt_copy(c, half_height - 20, is_student_copy=False, student_data=student_data, timestamp=timestamp, width=width)
    
    c.save()
    return filepath
