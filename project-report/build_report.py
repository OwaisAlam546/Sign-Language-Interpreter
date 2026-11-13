#!/usr/bin/env python3
"""
SignSpeak AI – BCA Final-Year Project Report Builder
Generates both print-ready PDF and editable Word DOCX report deliverables.
Strictly calibrated against the master reference 'Grand_Noire_Project_Report.pdf':
- Exactly 50 pages A4 (595.28 pt x 841.89 pt)
- DejaVu Serif font family throughout
- Exact academic page margins, line spacing, running headers and footers
- Chapters 1 to 39 (1 page per chapter, Pages 7 to 45)
- Authentic MS Ramaiah College logo on cover page
- Authentic student and institutional details
"""

import os
import sys
import argparse
from pathlib import Path

# Paths setup
REPORT_DIR = Path(__file__).resolve().parent
FONTS_DIR = REPORT_DIR / 'fonts'
if not FONTS_DIR.exists():
    FONTS_DIR = REPORT_DIR.parent / 'scratch' / 'fonts'

LOGO_PATH = REPORT_DIR / 'cover_logo.png'
if not LOGO_PATH.exists():
    LOGO_PATH = REPORT_DIR.parent / 'scratch' / 'cover_logo.png'

# Import report_data
sys.path.insert(0, str(REPORT_DIR))
import report_data as data


# ==============================================================================
# 1. PDF GENERATOR (ReportLab)
# ==============================================================================
def build_pdf(output_pdf_path=None):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.colors import HexColor

    if output_pdf_path is None:
        output_pdf_path = REPORT_DIR / 'SignSpeak_AI_Project_Report.pdf'

    print(f"Building PDF deliverable: {output_pdf_path} ...")

    # Register DejaVu Serif fonts
    pdfmetrics.registerFont(TTFont('DejaVuSerif', str(FONTS_DIR / 'DejaVuSerif.ttf')))
    pdfmetrics.registerFont(TTFont('DejaVuSerif-Bold', str(FONTS_DIR / 'DejaVuSerif-Bold.ttf')))
    pdfmetrics.registerFont(TTFont('DejaVuSerif-Italic', str(FONTS_DIR / 'DejaVuSerif-Italic.ttf')))
    pdfmetrics.registerFont(TTFont('DejaVuSerif-BoldItalic', str(FONTS_DIR / 'DejaVuSerif-BoldItalic.ttf')))

    W, H = A4
    LEFT_MARGIN = 76.9
    CONTENT_WIDTH = 450.0
    RIGHT_MARGIN = LEFT_MARGIN + CONTENT_WIDTH  # 526.9

    styles = getSampleStyleSheet()

    body_style = ParagraphStyle(
        'AcademicBody',
        parent=styles['Normal'],
        fontName='DejaVuSerif',
        fontSize=14,
        leading=19,
        alignment=TA_JUSTIFY,
        spaceAfter=9
    )

    bullet_style = ParagraphStyle(
        'AcademicBullet',
        parent=styles['Normal'],
        fontName='DejaVuSerif',
        fontSize=14,
        leading=19,
        alignment=TA_JUSTIFY,
        leftIndent=20,
        firstLineIndent=-14,
        spaceAfter=6
    )

    biblio_style = ParagraphStyle(
        'AcademicBiblio',
        parent=styles['Normal'],
        fontName='DejaVuSerif',
        fontSize=11,
        leading=16,
        alignment=TA_JUSTIFY,
        leftIndent=24,
        firstLineIndent=-24,
        spaceAfter=8
    )

    glossary_style = ParagraphStyle(
        'AcademicGlossary',
        parent=styles['Normal'],
        fontName='DejaVuSerif',
        fontSize=12,
        leading=17,
        alignment=TA_JUSTIFY,
        leftIndent=20,
        firstLineIndent=-20,
        spaceAfter=8
    )

    flow_style = ParagraphStyle(
        'AcademicFlow',
        parent=styles['Normal'],
        fontName='DejaVuSerif',
        fontSize=12,
        leading=17,
        alignment=TA_JUSTIFY,
        leftIndent=20,
        firstLineIndent=-16,
        spaceAfter=6
    )

    checklist_style = ParagraphStyle(
        'AcademicChecklist',
        parent=styles['Normal'],
        fontName='DejaVuSerif',
        fontSize=11.5,
        leading=16,
        alignment=TA_JUSTIFY,
        leftIndent=22,
        firstLineIndent=-18,
        spaceAfter=7
    )

    viva_q_style = ParagraphStyle(
        'AcademicVivaQ',
        parent=styles['Normal'],
        fontName='DejaVuSerif-Bold',
        fontSize=12,
        leading=16,
        alignment=TA_LEFT,
        spaceAfter=3
    )

    viva_a_style = ParagraphStyle(
        'AcademicVivaA',
        parent=styles['Normal'],
        fontName='DejaVuSerif',
        fontSize=11.5,
        leading=16,
        alignment=TA_JUSTIFY,
        leftIndent=14,
        spaceAfter=8
    )

    c = canvas.Canvas(str(output_pdf_path), pagesize=A4)
    c.setTitle('SignSpeak AI - BCA Project Report')
    c.setAuthor('Mohammed Owais Alam, Niranjan M, Raman Bharadwaj')
    c.setSubject('SignSpeak AI - Real-Time Sign Language Interpreter')

    def draw_header_footer(canvas_obj, page_num):
        if page_num == 1:
            return
        canvas_obj.setFont('DejaVuSerif', 9)
        canvas_obj.setFillColor(HexColor('#000000'))
        canvas_obj.drawString(70.9, H - 39.0, 'SIGNSPEAK AI | BCA PROJECT REPORT')
        canvas_obj.setStrokeColor(HexColor('#999999'))
        canvas_obj.setLineWidth(0.4)
        canvas_obj.line(70.9, H - 42.5, 532.9, H - 42.5)
        canvas_obj.setFont('DejaVuSerif', 9)
        canvas_obj.drawCentredString(W / 2.0, H - 815.7, str(page_num))

    # Page 1: Cover
    def draw_cover(canvas_obj):
        if LOGO_PATH.exists():
            canvas_obj.drawImage(str(LOGO_PATH), 191.3, H - 159.1, width=221.1, height=76.5, preserveAspectRatio=True, mask='auto')

        canvas_obj.setFont('DejaVuSerif', 14)
        canvas_obj.drawCentredString(W / 2.0, H - 204.8, 'A PROJECT REPORT ON')

        canvas_obj.setFont('DejaVuSerif-Bold', 20)
        canvas_obj.drawCentredString(W / 2.0, H - 246.4, data.PROJECT_TITLE)

        canvas_obj.setFont('DejaVuSerif', 14)
        canvas_obj.drawCentredString(W / 2.0, H - 276.0, data.PROJECT_SUBTITLE)

        canvas_obj.drawCentredString(W / 2.0, H - 330.0, 'Submitted in partial fulfilment of the requirements for the')
        canvas_obj.drawCentredString(W / 2.0, H - 350.0, 'award of')
        canvas_obj.drawCentredString(W / 2.0, H - 370.0, data.DEGREE_NAME)
        canvas_obj.drawCentredString(W / 2.0, H - 390.0, data.UNIVERSITY_NAME)

        canvas_obj.drawCentredString(W / 2.0, H - 444.0, 'Submitted by')

        tbl_x = 109.1
        tbl_w = 494.6 - 109.1
        tbl_top_y = H - 460.8
        row_h = 25.5
        canvas_obj.setStrokeColor(HexColor('#000000'))
        canvas_obj.setLineWidth(0.6)

        for i in range(5):
            y = tbl_top_y - i * row_h
            canvas_obj.line(tbl_x, y, tbl_x + tbl_w, y)
        canvas_obj.line(tbl_x, tbl_top_y, tbl_x, tbl_top_y - 4 * row_h)
        canvas_obj.line(tbl_x + tbl_w, tbl_top_y, tbl_x + tbl_w, tbl_top_y - 4 * row_h)

        canvas_obj.setFont('DejaVuSerif-Bold', 12)
        canvas_obj.drawCentredString(tbl_x + 105.0, tbl_top_y - 17.0, 'STUDENT NAME')
        canvas_obj.drawCentredString(tbl_x + 285.0, tbl_top_y - 17.0, 'REGISTRATION NUMBER')

        canvas_obj.setFont('DejaVuSerif', 12)
        for idx, m in enumerate(data.TEAM_MEMBERS):
            curr_y = tbl_top_y - (idx + 1) * row_h - 17.0
            canvas_obj.drawCentredString(tbl_x + 105.0, curr_y, m['name'])
            canvas_obj.drawCentredString(tbl_x + 285.0, curr_y, m['reg'])

        canvas_obj.setFont('DejaVuSerif', 14)
        canvas_obj.drawCentredString(W / 2.0, H - 614.2, 'Under the guidance of')
        canvas_obj.drawCentredString(W / 2.0, H - 634.2, 'Project Guide: __________________________________')
        canvas_obj.drawCentredString(W / 2.0, H - 654.2, 'Designation: ____________________________________')

        canvas_obj.drawCentredString(W / 2.0, H - 696.9, 'Department of Computer Science')
        canvas_obj.drawCentredString(W / 2.0, H - 716.9, 'MS Ramaiah College of Arts, Science and Commerce -')
        canvas_obj.drawCentredString(W / 2.0, H - 736.9, 'Autonomous')
        canvas_obj.drawCentredString(W / 2.0, H - 756.9, 'Bengaluru')

    # Page 2: Declaration
    def draw_declaration(canvas_obj):
        draw_header_footer(canvas_obj, 2)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, 'DECLARATION')

        y = H - 118.0
        decl_p1 = Paragraph(
            "We hereby declare that the project report entitled “<b>SignSpeak AI – Real-Time Sign Language Interpreter</b>” is prepared by us in partial fulfilment of the requirements for the award of the Bachelor of Computer Applications degree of Bengaluru City University.",
            body_style
        )
        w, h = decl_p1.wrap(CONTENT_WIDTH, 200)
        decl_p1.drawOn(canvas_obj, LEFT_MARGIN, y - h)
        y -= (h + 10)

        decl_p2 = Paragraph(
            "We state that the work presented in this report has been carried out by our project team under the guidance of the project guide in the Department of Computer Science, MS Ramaiah College of Arts, Science and Commerce - Autonomous, Bengaluru. The report describes the project concept, its user-facing features, the real-time sign recognition pipeline, and the technologies identified by the project team.",
            body_style
        )
        w, h = decl_p2.wrap(CONTENT_WIDTH, 200)
        decl_p2.drawOn(canvas_obj, LEFT_MARGIN, y - h)
        y -= (h + 10)

        decl_p3 = Paragraph(
            "We further declare that this report has not been submitted, either in full or in part, to any other university or institution for the award of any degree or diploma. Wherever information from external sources has been used, the sources have been acknowledged in the bibliography.",
            body_style
        )
        w, h = decl_p3.wrap(CONTENT_WIDTH, 200)
        decl_p3.drawOn(canvas_obj, LEFT_MARGIN, y - h)
        y -= (h + 20)

        canvas_obj.setFont('DejaVuSerif', 14)
        canvas_obj.drawString(LEFT_MARGIN, y, 'Date: ____________________')
        y -= 19
        canvas_obj.drawString(LEFT_MARGIN, y, 'Place: Bengaluru')
        y -= 30

        canvas_obj.drawString(LEFT_MARGIN, y, 'Submitted by')
        y -= 15

        tbl_x = 90.7
        tbl_w = 422.4
        tbl_top_y = y
        row_h = 31.2
        canvas_obj.setStrokeColor(HexColor('#000000'))
        canvas_obj.setLineWidth(0.5)

        for i in range(5):
            ly = tbl_top_y - i * row_h
            canvas_obj.line(tbl_x, ly, tbl_x + tbl_w, ly)
        canvas_obj.line(tbl_x, tbl_top_y, tbl_x, tbl_top_y - 4 * row_h)
        canvas_obj.line(tbl_x + tbl_w, tbl_top_y, tbl_x + tbl_w, tbl_top_y - 4 * row_h)
        canvas_obj.line(209.8, tbl_top_y, 209.8, tbl_top_y - 4 * row_h)
        canvas_obj.line(357.2, tbl_top_y, 357.2, tbl_top_y - 4 * row_h)

        canvas_obj.setFont('DejaVuSerif-Bold', 10)
        canvas_obj.drawCentredString((tbl_x + 209.8) / 2.0, tbl_top_y - 20.0, 'Signature')
        canvas_obj.drawCentredString((209.8 + 357.2) / 2.0, tbl_top_y - 20.0, 'Student name')
        canvas_obj.drawCentredString((357.2 + tbl_x + tbl_w) / 2.0, tbl_top_y - 20.0, 'Registration number')

        canvas_obj.setFont('DejaVuSerif', 10)
        for idx, m in enumerate(data.TEAM_MEMBERS):
            curr_y = tbl_top_y - (idx + 1) * row_h - 20.0
            canvas_obj.drawCentredString((tbl_x + 209.8) / 2.0, curr_y, '________________')
            canvas_obj.drawCentredString((209.8 + 357.2) / 2.0, curr_y, m['name'])
            canvas_obj.drawCentredString((357.2 + tbl_x + tbl_w) / 2.0, curr_y, m['reg'])

    # Page 3: Certificate
    def draw_certificate(canvas_obj):
        draw_header_footer(canvas_obj, 3)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, 'CERTIFICATE')

        y = H - 118.0
        cert_p1 = Paragraph(
            "This is to certify that the project report entitled “<b>SignSpeak AI – Real-Time Sign Language Interpreter</b>” has been prepared and submitted by the following students:",
            body_style
        )
        w, h = cert_p1.wrap(CONTENT_WIDTH, 200)
        cert_p1.drawOn(canvas_obj, LEFT_MARGIN, y - h)
        y -= (h + 10)

        for m in data.TEAM_MEMBERS:
            canvas_obj.setFont('DejaVuSerif', 14)
            canvas_obj.drawString(LEFT_MARGIN + 30.0, y, f"•  {m['name']} – {m['reg']}")
            y -= 20
        y -= 5

        cert_p2 = Paragraph(
            "The project is submitted in partial fulfilment of the requirements for the award of the Bachelor of Computer Applications degree of Bengaluru City University. The work has been carried out under the supervision and guidance of the Department of Computer Science, MS Ramaiah College of Arts, Science and Commerce - Autonomous, Bengaluru.",
            body_style
        )
        w, h = cert_p2.wrap(CONTENT_WIDTH, 200)
        cert_p2.drawOn(canvas_obj, LEFT_MARGIN, y - h)
        y -= (h + 10)

        cert_p3 = Paragraph(
            "The project report is recommended for evaluation, subject to the verification and approval of the project guide and the department.",
            body_style
        )
        w, h = cert_p3.wrap(CONTENT_WIDTH, 200)
        cert_p3.drawOn(canvas_obj, LEFT_MARGIN, y - h)
        y -= (h + 40)

        canvas_obj.setFont('DejaVuSerif', 12)
        canvas_obj.drawString(100.0, y, '________________________')
        canvas_obj.drawString(340.0, y, '________________________')
        y -= 25
        canvas_obj.setFont('DejaVuSerif-Bold', 12)
        canvas_obj.drawString(135.0, y, 'Project Guide')
        canvas_obj.drawString(345.0, y, 'Head of the Department')
        y -= 25
        canvas_obj.setFont('DejaVuSerif', 12)
        canvas_obj.drawString(100.0, y, 'Name: __________________')
        canvas_obj.drawString(335.0, y, 'Name: __________________')
        y -= 25
        canvas_obj.drawString(100.0, y, 'Date: ___________________')
        canvas_obj.drawString(335.0, y, 'Date: ___________________')
        y -= 50

        canvas_obj.setFont('DejaVuSerif-Bold', 12)
        canvas_obj.drawString(LEFT_MARGIN, y, 'Examiners')
        y -= 22
        canvas_obj.setFont('DejaVuSerif', 12)
        canvas_obj.drawString(LEFT_MARGIN, y, '1. ______________________________________')
        y -= 20
        canvas_obj.drawString(LEFT_MARGIN, y, '2. ______________________________________')
        y -= 30
        canvas_obj.drawString(LEFT_MARGIN, y, 'Examination Centre: _______________________')
        y -= 20
        canvas_obj.drawString(LEFT_MARGIN, y, 'Date: _________________________________')

    # Page 4: Acknowledgement
    def draw_acknowledgement(canvas_obj):
        draw_header_footer(canvas_obj, 4)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, 'ACKNOWLEDGEMENT')

        y = H - 118.0
        ack_paragraphs = [
            "We express our sincere gratitude to the management and trustees of MS Ramaiah College of Arts, Science and Commerce - Autonomous for providing the academic environment and laboratory facilities required to undertake this final-year project.",
            "We extend our heartfelt thanks to the Principal, the Head of the Department of Computer Science, and all faculty members who have supported our learning and encouraged us during the development of SignSpeak AI. Their academic guidance helped us understand the importance of systematic planning, computer vision engineering, architectural documentation, and rigorous verification.",
            "We are deeply grateful to our project guide for the continuous guidance, constructive suggestions, and critical feedback provided during the conceptualization and implementation of this project. We also thank our classmates, friends, and family members for their unwavering encouragement and moral support.",
            "Finally, we acknowledge the documentation and resources provided by the open-source community, including the developers of React, Google MediaPipe, ONNX Runtime Web, TensorFlow, and FastAPI. These foundational platforms enabled us to realize an accessible, real-time sign language interpreter."
        ]

        for p_text in ack_paragraphs:
            p = Paragraph(p_text, body_style)
            w, h = p.wrap(CONTENT_WIDTH, 200)
            p.drawOn(canvas_obj, LEFT_MARGIN, y - h)
            y -= (h + 10)

        y -= 20
        canvas_obj.setFont('DejaVuSerif-Bold', 13)
        for m in data.TEAM_MEMBERS:
            canvas_obj.drawString(RIGHT_MARGIN - 200.0, y, m['name'])
            y -= 20

    # Pages 5 & 6: Table of Contents
    def draw_toc(canvas_obj, part):
        page_num = 5 if part == 1 else 6
        draw_header_footer(canvas_obj, page_num)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        title_text = 'TABLE OF CONTENTS' if part == 1 else 'TABLE OF CONTENTS (CONTINUED)'
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, title_text)

        entries_part1 = [
            ('Preliminary Pages', ''),
            ('1. Introduction', '7'),
            ('2. Abstract and Project Objectives', '8'),
            ('3. Scope and Significance', '9'),
            ('4. Literature Review and Related Work', '10'),
            ('5. Existing System and Proposed System', '11'),
            ('6. Feasibility Study', '12'),
            ('7. Requirements Analysis', '13'),
            ('8. Development Process', '14'),
            ('9. Methodology', '15'),
            ('10. System Architecture', '16'),
            ('11. User Roles and Use Cases', '17'),
            ('12. Application Navigation and Information Flow', '18'),
            ('13. Technology Stack', '19'),
            ('14. Computer Vision and MediaPipe', '20'),
            ('15. Hand Landmark Representation', '21'),
            ('16. Feature Extraction and Preprocessing', '22'),
            ('17. Machine Learning Model', '23'),
            ('18. ONNX and Model Inference', '24'),
            ('19. TensorFlow/Keras Sequence Inference', '25'),
            ('20. Live Recognition Workflow', '26')
        ]

        entries_part2 = [
            ('21. Static Alphabet Recognition', '27'),
            ('22. Gesture Library – Letters A to Z', '28'),
            ('23. Gesture Library – Words and Two-Handed Sign Visualization', '29'),
            ('24. Text-to-Speech Functionality', '30'),
            ('25. User Interface Design', '31'),
            ('26. Frontend Architecture and Components', '32'),
            ('27. Backend Services and API Architecture', '33'),
            ('28. API Communication and Data Flow', '34'),
            ('29. Data and Model Organization', '35'),
            ('30. Security and Privacy Considerations', '36'),
            ('31. System Setup and Development Environment', '37'),
            ('32. System Deployment and Configuration', '38'),
            ('33. Testing Strategy', '39'),
            ('34. Test Cases and Expected Results', '40'),
            ('35. Evaluation Metrics', '41'),
            ('36. Results and Analysis', '42'),
            ('37. Challenges and Limitations', '43'),
            ('38. Future Enhancements', '44'),
            ('39. Conclusion', '45'),
            ('Bibliography', '46'),
            ('Appendix A – Glossary', '47'),
            ('Appendix B – Sample User Flows', '48'),
            ('Appendix C – Project Verification Checklist', '49'),
            ('Appendix D – Team Contribution and Viva Notes', '50')
        ]

        entries = entries_part1 if part == 1 else entries_part2
        y = H - 120.0
        canvas_obj.setFont('DejaVuSerif', 12.5)

        for title, pno_str in entries:
            canvas_obj.drawString(LEFT_MARGIN, y, title)
            title_w = canvas_obj.stringWidth(title, 'DejaVuSerif', 12.5)
            if pno_str:
                pno_w = canvas_obj.stringWidth(pno_str, 'DejaVuSerif', 12.5)
                canvas_obj.drawRightString(RIGHT_MARGIN, y, pno_str)
                dots_start = LEFT_MARGIN + title_w + 6.0
                dots_end = RIGHT_MARGIN - pno_w - 6.0
                dots_w = canvas_obj.stringWidth('. ', 'DejaVuSerif', 12.5)
                num_dots = int((dots_end - dots_start) / dots_w)
                if num_dots > 0:
                    canvas_obj.drawString(dots_start, y, '. ' * num_dots)
            else:
                dots_start = LEFT_MARGIN + title_w + 6.0
                dots_end = RIGHT_MARGIN
                dots_w = canvas_obj.stringWidth('. ', 'DejaVuSerif', 12.5)
                num_dots = int((dots_end - dots_start) / dots_w)
                if num_dots > 0:
                    canvas_obj.drawString(dots_start, y, '. ' * num_dots)
            y -= 21.0

    # Pages 7 to 45: Chapters 1 to 39
    def draw_chapter(canvas_obj, ch_data, page_num):
        draw_header_footer(canvas_obj, page_num)
        ch_num, title, subheading, paragraphs, key_points = ch_data

        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, title)

        canvas_obj.setFont('DejaVuSerif-Bold', 16)
        canvas_obj.drawString(LEFT_MARGIN, H - 123.2, subheading)

        y = H - 146.0
        for p_text in paragraphs:
            p = Paragraph(p_text, body_style)
            w, h = p.wrap(CONTENT_WIDTH, 300)
            p.drawOn(canvas_obj, LEFT_MARGIN, y - h)
            y -= (h + 8)

        y -= 8
        canvas_obj.setFont('DejaVuSerif-Bold', 16)
        canvas_obj.drawString(LEFT_MARGIN, y, 'Key points')
        y -= 22

        for kp_text in key_points:
            bullet_p = Paragraph(f"•  {kp_text}", bullet_style)
            w, h = bullet_p.wrap(CONTENT_WIDTH, 150)
            bullet_p.drawOn(canvas_obj, LEFT_MARGIN, y - h)
            y -= (h + 5)

    # Page 46: Bibliography
    def draw_bibliography(canvas_obj):
        draw_header_footer(canvas_obj, 46)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, 'BIBLIOGRAPHY')

        y = H - 125.0
        for idx, entry in enumerate(data.BIBLIOGRAPHY_ENTRIES, 1):
            p = Paragraph(f"[{idx}]  {entry}", biblio_style)
            w, h = p.wrap(CONTENT_WIDTH, 120)
            p.drawOn(canvas_obj, LEFT_MARGIN, y - h)
            y -= (h + 6)

    # Page 47: Appendix A
    def draw_appendix_a(canvas_obj):
        draw_header_footer(canvas_obj, 47)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, 'APPENDIX A – GLOSSARY')

        y = H - 125.0
        for term, definition in data.APPENDIX_A_GLOSSARY:
            p = Paragraph(f"<b>{term}:</b>  {definition}", glossary_style)
            w, h = p.wrap(CONTENT_WIDTH, 120)
            p.drawOn(canvas_obj, LEFT_MARGIN, y - h)
            y -= (h + 5)

    # Page 48: Appendix B
    def draw_appendix_b(canvas_obj):
        draw_header_footer(canvas_obj, 48)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, 'APPENDIX B – SAMPLE USER FLOWS')

        y = H - 125.0
        for flow in data.APPENDIX_B_FLOWS:
            canvas_obj.setFont('DejaVuSerif-Bold', 14)
            canvas_obj.drawString(LEFT_MARGIN, y, flow['title'])
            y -= 20
            for step in flow['steps']:
                p = Paragraph(step, flow_style)
                w, h = p.wrap(CONTENT_WIDTH, 120)
                p.drawOn(canvas_obj, LEFT_MARGIN, y - h)
                y -= (h + 3)
            y -= 10

    # Page 49: Appendix C
    def draw_appendix_c(canvas_obj):
        draw_header_footer(canvas_obj, 49)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 90.7, 'APPENDIX C – PROJECT VERIFICATION CHECKLIST')

        y = H - 125.0
        for item, status in data.APPENDIX_C_CHECKLIST:
            p = Paragraph(f"<b>[X]  {item}:</b>  {status}", checklist_style)
            w, h = p.wrap(CONTENT_WIDTH, 120)
            p.drawOn(canvas_obj, LEFT_MARGIN, y - h)
            y -= (h + 5)

        y -= 15
        canvas_obj.setFont('DejaVuSerif-Bold', 12)
        canvas_obj.drawString(LEFT_MARGIN, y, 'Verified and Approved by Project Team:')
        y -= 20
        canvas_obj.setFont('DejaVuSerif', 11)
        canvas_obj.drawString(LEFT_MARGIN, y, 'Mohammed Owais Alam               Niranjan M               Raman Bharadwaj')
        y -= 18
        canvas_obj.drawString(LEFT_MARGIN, y, 'Date: ____________________        Status: COMPLETE')

    # Page 50: Appendix D
    def draw_appendix_d(canvas_obj):
        draw_header_footer(canvas_obj, 50)
        canvas_obj.setFont('DejaVuSerif-Bold', 18)
        canvas_obj.drawCentredString(W / 2.0, H - 85.0, 'APPENDIX D – TEAM CONTRIBUTION AND')
        canvas_obj.drawCentredString(W / 2.0, H - 106.0, 'VIVA NOTES')

        canvas_obj.setFont('DejaVuSerif-Bold', 15)
        canvas_obj.drawString(LEFT_MARGIN, H - 132.0, 'Team members')

        y = H - 150.0
        for m in data.TEAM_MEMBERS:
            canvas_obj.setFont('DejaVuSerif-Bold', 12)
            canvas_obj.drawString(LEFT_MARGIN, y, f"{m['name']} – {m['reg']}")
            canvas_obj.setFont('DejaVuSerif', 11)
            canvas_obj.drawString(LEFT_MARGIN + 250.0, y, m['role'])
            y -= 17

        y -= 6
        p_team = Paragraph(
            "The project is a collaborative effort by all three members. Specific task allocation assigned model architecture, ONNX export, and gateway engineering to Mohammed Owais Alam; React frontend architecture, state management, and 3D skeleton components to Niranjan M; and computer vision pipeline, temporal stabilization, and regression testing to Raman Bharadwaj.",
            ParagraphStyle('TeamP', parent=body_style, fontSize=11, leading=15, spaceAfter=8)
        )
        w, h = p_team.wrap(CONTENT_WIDTH, 120)
        p_team.drawOn(canvas_obj, LEFT_MARGIN, y - h)
        y -= (h + 10)

        canvas_obj.setFont('DejaVuSerif-Bold', 14)
        canvas_obj.drawString(LEFT_MARGIN, y, 'Suggested viva questions and model answers')
        y -= 18

        for q, a in data.APPENDIX_D_VIVA[:3]:
            qp = Paragraph(q, viva_q_style)
            qw, qh = qp.wrap(CONTENT_WIDTH, 80)
            qp.drawOn(canvas_obj, LEFT_MARGIN, y - qh)
            y -= (qh + 2)

            ap = Paragraph(a, viva_a_style)
            aw, ah = ap.wrap(CONTENT_WIDTH, 120)
            ap.drawOn(canvas_obj, LEFT_MARGIN, y - ah)
            y -= (ah + 6)

        y -= 4
        note_p = Paragraph(
            "<b>Final submission note:</b> Confirm project guide name, designation, and official evaluation dates before final departmental binding. All technical implementations reported have been audited against the active project repository.",
            ParagraphStyle('NoteP', parent=body_style, fontSize=10.5, leading=14.5)
        )
        w, h = note_p.wrap(CONTENT_WIDTH, 80)
        note_p.drawOn(canvas_obj, LEFT_MARGIN, y - h)

    # Render All 50 Pages
    draw_cover(c)
    c.showPage()

    draw_declaration(c)
    c.showPage()

    draw_certificate(c)
    c.showPage()

    draw_acknowledgement(c)
    c.showPage()

    draw_toc(c, 1)
    c.showPage()

    draw_toc(c, 2)
    c.showPage()

    for idx, ch in enumerate(data.CHAPTERS):
        page_num = 7 + idx
        draw_chapter(c, ch, page_num)
        c.showPage()

    draw_bibliography(c)
    c.showPage()

    draw_appendix_a(c)
    c.showPage()

    draw_appendix_b(c)
    c.showPage()

    draw_appendix_c(c)
    c.showPage()

    draw_appendix_d(c)
    c.showPage()

    c.save()
    print(f"Generated PDF successfully at {output_pdf_path} (Total 50 pages)")


# ==============================================================================
# 2. DOCX GENERATOR (python-docx)
# ==============================================================================
def build_docx(output_docx_path=None):
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
    from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    if output_docx_path is None:
        output_docx_path = REPORT_DIR / 'SignSpeak_AI_Project_Report.docx'

    print(f"Building DOCX deliverable: {output_docx_path} ...")

    doc = Document()

    # Page setup: A4 portrait
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(1.07)   # 76.9 pt
    section.right_margin = Inches(0.95)  # 68.4 pt

    # Base style
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'DejaVu Serif'
    normal_style._element.rPr.rFonts.set(qn('w:eastAsia'), 'DejaVu Serif')
    normal_style.font.size = Pt(14)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)
    normal_style.paragraph_format.line_spacing = Pt(19)
    normal_style.paragraph_format.space_after = Pt(8)

    # First page header is different (Cover page has no header/footer)
    section.different_first_page_header_footer = True

    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    hrun = hp.add_run("SIGNSPEAK AI | BCA PROJECT REPORT")
    hrun.font.name = 'DejaVu Serif'
    hrun.font.size = Pt(9)
    hrun.font.color.rgb = RGBColor(0, 0, 0)

    pPr = hp._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '4')
    bottom.set(qn('w:space'), '3')
    bottom.set(qn('w:color'), '999999')
    pBdr.append(bottom)
    pPr.append(pBdr)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    f_run = fp.add_run()
    fld = OxmlElement('w:fldSimple')
    fld.set(qn('w:instr'), 'PAGE')
    fp._p.append(fld)
    for r in fp.runs:
        r.font.name = 'DejaVu Serif'
        r.font.size = Pt(9)

    def add_p(text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, size=14, before=0, after=8, bullet=False):
        p = doc.add_paragraph()
        p.alignment = align
        pf = p.paragraph_format
        pf.line_spacing = Pt(19)
        pf.space_before = Pt(before)
        pf.space_after = Pt(after)
        if bullet:
            pf.left_indent = Inches(0.28)
            pf.first_line_indent = Inches(-0.2)
        r = p.add_run(text)
        r.bold = bold
        r.font.name = 'DejaVu Serif'
        r.font.size = Pt(size)
        return p

    def add_h1(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(14)
        r = p.add_run(text)
        r.bold = True
        r.font.name = 'DejaVu Serif'
        r.font.size = Pt(18)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(8)
        r = p.add_run(text)
        r.bold = True
        r.font.name = 'DejaVu Serif'
        r.font.size = Pt(16)
        return p

    def add_page_break():
        doc.add_page_break()

    # Cover
    if LOGO_PATH.exists():
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(0)
        p_logo.paragraph_format.space_after = Pt(14)
        run_logo = p_logo.add_run()
        run_logo.add_picture(str(LOGO_PATH), width=Inches(3.07))

    add_p('A PROJECT REPORT ON', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=8)
    add_p(data.PROJECT_TITLE, WD_ALIGN_PARAGRAPH.CENTER, True, 20, after=6)
    add_p(data.PROJECT_SUBTITLE, WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=24)

    add_p('Submitted in partial fulfilment of the requirements for the', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=2)
    add_p('award of', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=2)
    add_p(data.DEGREE_NAME, WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=2)
    add_p(data.UNIVERSITY_NAME, WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=20)

    add_p('Submitted by', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=8)

    table = doc.add_table(rows=4, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_widths = [Inches(2.68), Inches(2.68)]
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'STUDENT NAME'
    hdr_cells[1].text = 'REGISTRATION NUMBER'

    for idx, m in enumerate(data.TEAM_MEMBERS):
        row_cells = table.rows[idx + 1].cells
        row_cells[0].text = m['name']
        row_cells[1].text = m['reg']

    for row_idx, row in enumerate(table.rows):
        for cell in row.cells:
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = Pt(14)
            for r in p.runs:
                r.font.name = 'DejaVu Serif'
                r.font.size = Pt(11)
                if row_idx == 0:
                    r.bold = True

    tblPr = table._tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for tag in ('top', 'left', 'bottom', 'right', 'insideH'):
        x = OxmlElement('w:' + tag)
        x.set(qn('w:val'), 'single')
        x.set(qn('w:sz'), '6')
        x.set(qn('w:color'), '000000')
        b.append(x)
    tblPr.append(b)

    add_p('Under the guidance of', WD_ALIGN_PARAGRAPH.CENTER, False, 14, before=18, after=6)
    add_p('Project Guide: __________________________________', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=4)
    add_p('Designation: ____________________________________', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=18)

    add_p('Department of Computer Science', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=2)
    add_p('MS Ramaiah College of Arts, Science and Commerce -', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=2)
    add_p('Autonomous', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=2)
    add_p('Bengaluru', WD_ALIGN_PARAGRAPH.CENTER, False, 14, after=0)
    add_page_break()

    # Declaration
    add_h1('DECLARATION')
    add_p("We hereby declare that the project report entitled “SignSpeak AI – Real-Time Sign Language Interpreter” is prepared by us in partial fulfilment of the requirements for the award of the Bachelor of Computer Applications degree of Bengaluru City University.")
    add_p("We state that the work presented in this report has been carried out by our project team under the guidance of the project guide in the Department of Computer Science, MS Ramaiah College of Arts, Science and Commerce - Autonomous, Bengaluru. The report describes the project concept, its user-facing features, the real-time sign recognition pipeline, and the technologies identified by the project team.")
    add_p("We further declare that this report has not been submitted, either in full or in part, to any other university or institution for the award of any degree or diploma. Wherever information from external sources has been used, the sources have been acknowledged in the bibliography.")

    add_p('Date: ____________________', before=12, after=2)
    add_p('Place: Bengaluru', after=16)
    add_p('Submitted by', after=6)

    decl_table = doc.add_table(rows=4, cols=3)
    decl_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    d_widths = [Inches(1.8), Inches(2.2), Inches(2.0)]
    d_headers = ['Signature', 'Student name', 'Registration number']
    for col_idx, text in enumerate(d_headers):
        cell = decl_table.cell(0, col_idx)
        cell.width = d_widths[col_idx]
        cell.text = ''
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text)
        r.bold = True
        r.font.name = 'DejaVu Serif'
        r.font.size = Pt(10)

    for row_idx, m in enumerate(data.TEAM_MEMBERS, start=1):
        for col_idx, text in enumerate(['________________', m['name'], m['reg']]):
            cell = decl_table.cell(row_idx, col_idx)
            cell.width = d_widths[col_idx]
            cell.text = ''
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(text)
            r.font.name = 'DejaVu Serif'
            r.font.size = Pt(10)

    dtPr = decl_table._tbl.tblPr
    db = OxmlElement('w:tblBorders')
    for tag in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        x = OxmlElement('w:' + tag)
        x.set(qn('w:val'), 'single')
        x.set(qn('w:sz'), '4')
        x.set(qn('w:color'), '000000')
        db.append(x)
    dtPr.append(db)
    add_page_break()

    # Certificate
    add_h1('CERTIFICATE')
    add_p("This is to certify that the project report entitled “SignSpeak AI – Real-Time Sign Language Interpreter” has been prepared and submitted by the following students:")
    for m in data.TEAM_MEMBERS:
        add_p(f"•  {m['name']} – {m['reg']}", bullet=True, after=4)

    add_p("The project is submitted in partial fulfilment of the requirements for the award of the Bachelor of Computer Applications degree of Bengaluru City University. The work has been carried out under the supervision and guidance of the Department of Computer Science, MS Ramaiah College of Arts, Science and Commerce - Autonomous, Bengaluru.", before=8)
    add_p("The project report is recommended for evaluation, subject to the verification and approval of the project guide and the department.")

    add_p("________________________                         ________________________", WD_ALIGN_PARAGRAPH.CENTER, before=24, after=4)
    add_p("Project Guide                                      Head of the Department", WD_ALIGN_PARAGRAPH.CENTER, bold=True, after=8)
    add_p("Name: __________________                         Name: __________________", WD_ALIGN_PARAGRAPH.CENTER, after=4)
    add_p("Date: ___________________                         Date: ___________________", WD_ALIGN_PARAGRAPH.CENTER, after=20)

    add_p("Examiners", bold=True, before=10, after=4)
    add_p("1. ______________________________________", after=4)
    add_p("2. ______________________________________", after=10)
    add_p("Examination Centre: _______________________", after=4)
    add_p("Date: _________________________________", after=0)
    add_page_break()

    # Acknowledgement
    add_h1('ACKNOWLEDGEMENT')
    ack_paragraphs = [
        "We express our sincere gratitude to the management and trustees of MS Ramaiah College of Arts, Science and Commerce - Autonomous for providing the academic environment and laboratory facilities required to undertake this final-year project.",
        "We extend our heartfelt thanks to the Principal, the Head of the Department of Computer Science, and all faculty members who have supported our learning and encouraged us during the development of SignSpeak AI. Their academic guidance helped us understand the importance of systematic planning, computer vision engineering, architectural documentation, and rigorous verification.",
        "We are deeply grateful to our project guide for the continuous guidance, constructive suggestions, and critical feedback provided during the conceptualization and implementation of this project. We also thank our classmates, friends, and family members for their unwavering encouragement and moral support.",
        "Finally, we acknowledge the documentation and resources provided by the open-source community, including the developers of React, Google MediaPipe, ONNX Runtime Web, TensorFlow, and FastAPI. These foundational platforms enabled us to realize an accessible, real-time sign language interpreter."
    ]
    for p_text in ack_paragraphs:
        add_p(p_text)

    add_p("", after=16)
    for m in data.TEAM_MEMBERS:
        add_p(m['name'], WD_ALIGN_PARAGRAPH.RIGHT, True, 13, after=2)
    add_page_break()

    # Table of Contents
    entries_part1 = [
        ('Preliminary Pages', ''),
        ('1. Introduction', '7'),
        ('2. Abstract and Project Objectives', '8'),
        ('3. Scope and Significance', '9'),
        ('4. Literature Review and Related Work', '10'),
        ('5. Existing System and Proposed System', '11'),
        ('6. Feasibility Study', '12'),
        ('7. Requirements Analysis', '13'),
        ('8. Development Process', '14'),
        ('9. Methodology', '15'),
        ('10. System Architecture', '16'),
        ('11. User Roles and Use Cases', '17'),
        ('12. Application Navigation and Information Flow', '18'),
        ('13. Technology Stack', '19'),
        ('14. Computer Vision and MediaPipe', '20'),
        ('15. Hand Landmark Representation', '21'),
        ('16. Feature Extraction and Preprocessing', '22'),
        ('17. Machine Learning Model', '23'),
        ('18. ONNX and Model Inference', '24'),
        ('19. TensorFlow/Keras Sequence Inference', '25'),
        ('20. Live Recognition Workflow', '26')
    ]

    entries_part2 = [
        ('21. Static Alphabet Recognition', '27'),
        ('22. Gesture Library – Letters A to Z', '28'),
        ('23. Gesture Library – Words and Two-Handed Sign Visualization', '29'),
        ('24. Text-to-Speech Functionality', '30'),
        ('25. User Interface Design', '31'),
        ('26. Frontend Architecture and Components', '32'),
        ('27. Backend Services and API Architecture', '33'),
        ('28. API Communication and Data Flow', '34'),
        ('29. Data and Model Organization', '35'),
        ('30. Security and Privacy Considerations', '36'),
        ('31. System Setup and Development Environment', '37'),
        ('32. System Deployment and Configuration', '38'),
        ('33. Testing Strategy', '39'),
        ('34. Test Cases and Expected Results', '40'),
        ('35. Evaluation Metrics', '41'),
        ('36. Results and Analysis', '42'),
        ('37. Challenges and Limitations', '43'),
        ('38. Future Enhancements', '44'),
        ('39. Conclusion', '45'),
        ('Bibliography', '46'),
        ('Appendix A – Glossary', '47'),
        ('Appendix B – Sample User Flows', '48'),
        ('Appendix C – Project Verification Checklist', '49'),
        ('Appendix D – Team Contribution and Viva Notes', '50')
    ]

    add_h1('TABLE OF CONTENTS')
    for name, pno in entries_part1:
        dots = '. ' * max(2, int((55 - len(name)) / 2))
        line = f"{name} {dots} {pno}".strip()
        add_p(line, size=13, after=5)
    add_page_break()

    add_h1('TABLE OF CONTENTS (CONTINUED)')
    for name, pno in entries_part2:
        dots = '. ' * max(2, int((55 - len(name)) / 2))
        line = f"{name} {dots} {pno}".strip()
        add_p(line, size=13, after=5)
    add_page_break()

    # Chapters 1 to 39
    for ch_idx, ch in enumerate(data.CHAPTERS):
        ch_num, title, subheading, paragraphs, key_points = ch
        add_h1(title)
        add_h2(subheading)
        for p_text in paragraphs:
            add_p(p_text)
        add_h2('Key points')
        for kp in key_points:
            add_p(f"•  {kp}", bullet=True, after=4)
        add_page_break()

    # Bibliography
    add_h1('BIBLIOGRAPHY')
    for idx, entry in enumerate(data.BIBLIOGRAPHY_ENTRIES, 1):
        add_p(f"[{idx}]  {entry}", size=11, after=6)
    add_page_break()

    # Appendix A
    add_h1('APPENDIX A – GLOSSARY')
    for term, definition in data.APPENDIX_A_GLOSSARY:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = Pt(17)
        p.paragraph_format.space_after = Pt(6)
        r_term = p.add_run(f"{term}: ")
        r_term.bold = True
        r_term.font.name = 'DejaVu Serif'
        r_term.font.size = Pt(12)
        r_def = p.add_run(definition)
        r_def.font.name = 'DejaVu Serif'
        r_def.font.size = Pt(12)
    add_page_break()

    # Appendix B
    add_h1('APPENDIX B – SAMPLE USER FLOWS')
    for flow in data.APPENDIX_B_FLOWS:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(8)
        p_t.paragraph_format.space_after = Pt(4)
        r_t = p_t.add_run(flow['title'])
        r_t.bold = True
        r_t.font.name = 'DejaVu Serif'
        r_t.font.size = Pt(13)

        for step in flow['steps']:
            p_s = doc.add_paragraph()
            p_s.paragraph_format.line_spacing = Pt(16)
            p_s.paragraph_format.space_after = Pt(3)
            p_s.paragraph_format.left_indent = Inches(0.2)
            r_s = p_s.add_run(step)
            r_s.font.name = 'DejaVu Serif'
            r_s.font.size = Pt(11.5)
    add_page_break()

    # Appendix C
    add_h1('APPENDIX C – PROJECT VERIFICATION CHECKLIST')
    for item, status in data.APPENDIX_C_CHECKLIST:
        p_c = doc.add_paragraph()
        p_c.paragraph_format.line_spacing = Pt(16)
        p_c.paragraph_format.space_after = Pt(4)
        p_c.paragraph_format.left_indent = Inches(0.2)
        r_bx = p_c.add_run("[X]  ")
        r_bx.bold = True
        r_bx.font.name = 'DejaVu Serif'
        r_bx.font.size = Pt(11)
        r_it = p_c.add_run(f"{item}: ")
        r_it.bold = True
        r_it.font.name = 'DejaVu Serif'
        r_it.font.size = Pt(11)
        r_st = p_c.add_run(status)
        r_st.font.name = 'DejaVu Serif'
        r_st.font.size = Pt(11)

    add_p("", after=10)
    add_p("Verified and Approved by Project Team:", bold=True, size=12, after=6)
    add_p("Mohammed Owais Alam               Niranjan M               Raman Bharadwaj", size=11, after=4)
    add_p("Date: ____________________        Status: COMPLETE", size=11, after=0)
    add_page_break()

    # Appendix D
    add_h1('APPENDIX D – TEAM CONTRIBUTION AND VIVA NOTES')
    add_p("Team members", bold=True, size=15, before=4, after=8)
    for m in data.TEAM_MEMBERS:
        add_p(f"{m['name']} – {m['reg']}            {m['role']}", bold=True, size=11.5, after=3)

    add_p("The project is a collaborative effort by all three members. Specific task allocation assigned model architecture, ONNX export, and gateway engineering to Mohammed Owais Alam; React frontend architecture, state management, and 3D skeleton components to Niranjan M; and computer vision pipeline, temporal stabilization, and regression testing to Raman Bharadwaj.", size=11, before=6, after=12)

    add_p("Suggested viva questions and model answers", bold=True, size=14, after=8)
    for q, a in data.APPENDIX_D_VIVA[:3]:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_after = Pt(2)
        r_q = p_q.add_run(q)
        r_q.bold = True
        r_q.font.name = 'DejaVu Serif'
        r_q.font.size = Pt(11.5)

        p_a = doc.add_paragraph()
        p_a.paragraph_format.line_spacing = Pt(16)
        p_a.paragraph_format.space_after = Pt(6)
        p_a.paragraph_format.left_indent = Inches(0.15)
        r_a = p_a.add_run(a)
        r_a.font.name = 'DejaVu Serif'
        r_a.font.size = Pt(11)

    add_p("Final submission note: Confirm project guide name, designation, and official evaluation dates before final departmental binding. All technical implementations reported have been audited against the active project repository.", bold=True, size=10.5, before=10, after=0)

    doc.save(str(output_docx_path))
    print(f"Generated DOCX successfully at {output_docx_path}")


# ==============================================================================
# 3. CLI ENTRYPOINT
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="SignSpeak AI – Project Report Generator")
    parser.add_argument("--pdf", action="store_true", help="Generate only PDF deliverable")
    parser.add_argument("--docx", action="store_true", help="Generate only DOCX deliverable")
    args = parser.parse_args()

    build_both = not args.pdf and not args.docx

    if build_both or args.pdf:
        build_pdf()

    if build_both or args.docx:
        build_docx()

    print("\nSignSpeak AI Project Report build completed successfully!")


if __name__ == '__main__':
    main()
