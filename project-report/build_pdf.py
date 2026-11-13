from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black, HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth
from build_report import TEAM, chapters

OUT=Path(__file__).resolve().parent; PDF=OUT/'SignSpeak_AI_Project_Report.pdf'
LOGO=OUT/'ramaiah_college_logo.png'
REG='Georgia'; BOLD='Georgia-Bold'
pdfmetrics.registerFont(TTFont(REG, r'C:\Windows\Fonts\georgia.ttf'))
pdfmetrics.registerFont(TTFont(BOLD, r'C:\Windows\Fonts\georgiab.ttf'))
W,H=A4; L=52; R=W-52; TOP=790; BOTTOM=55

def wrap(text,font,size,width):
    out=[]
    for para in text.split('\n'):
        line=''
        for word in para.split():
            trial=(line+' '+word).strip()
            if stringWidth(trial,font,size)<=width: line=trial
            else: out.append(line); line=word
        if line: out.append(line)
    return out
def header(c,p):
    c.setFont(REG,9); c.drawCentredString(W/2,H-34,'SIGNSPEAK AI  |  BCA PROJECT REPORT'); c.setLineWidth(.45); c.line(L,H-40,R,H-40)
    c.setFont(REG,9); c.drawCentredString(W/2,30,str(p))
def title(c,text,y,sub=False):
    size=16 if sub else 18; c.setFont(BOLD,size); c.drawCentredString(W/2,y,text); return y-30
def body(c,text,y,size=14):
    c.setFont(REG,size)
    for line in wrap(text,REG,size,R-L): c.drawString(L,y,line); y-=19
    return y-8
def table(c,x,y,widths,rows,fs=10):
    rh=22; h=rh*len(rows); c.setLineWidth(.45)
    for i,row in enumerate(rows):
        xx=x
        for j,(cell,wid) in enumerate(zip(row,widths)):
            c.rect(xx,y-(i+1)*rh,wid,rh); c.setFont(BOLD if i==0 else REG,fs); c.drawCentredString(xx+wid/2,y-i*rh-15,cell); xx+=wid
    return y-h-12
def cover(c):
    c.drawImage(str(LOGO),170,665,width=255,height=88,mask='auto'); y=625
    c.setFont(REG,14); c.drawCentredString(W/2,y,'A PROJECT REPORT ON'); y-=40
    c.setFont(BOLD,20); c.drawCentredString(W/2,y,'SIGNSPEAK AI'); y-=29; c.setFont(REG,16); c.drawCentredString(W/2,y,'REAL-TIME SIGN LANGUAGE INTERPRETER'); y-=54
    c.setFont(REG,14); c.drawCentredString(W/2,y,'Submitted in partial fulfilment of the requirements for the'); y-=22; c.drawCentredString(W/2,y,'award of'); y-=22
    c.setFont(REG,14); c.drawCentredString(W/2,y,'BACHELOR OF COMPUTER APPLICATIONS'); y-=22; c.drawCentredString(W/2,y,'BENGALURU CITY UNIVERSITY'); y-=54; c.drawCentredString(W/2,y,'Submitted by'); y-=22
    rows=[['NAME','REGISTRATION NUMBER']]+[[n,i] for n,i,_ in TEAM]; y=table(c,125,y,[220,130],rows,9); y-=8
    c.setFont(REG,14); c.drawCentredString(W/2,y,'Under the guidance of'); y-=20; c.drawString(110,y,'Project Guide:'); c.line(220,y-3,450,y-3); y-=22; c.drawString(110,y,'Designation:'); c.line(200,y-3,450,y-3); y-=45; c.drawCentredString(W/2,y,'Department of Computer Science'); y-=22; c.drawCentredString(W/2,y,'MS Ramaiah College of Arts, Science and Commerce -'); y-=22; c.drawCentredString(W/2,y,'Autonomous'); y-=22; c.drawCentredString(W/2,y,'Bengaluru')
def formal(c,p,title_text,text,sign=False):
    header(c,p); y=title(c,title_text,760); y=body(c,text,y)
    if sign:
        y=table(c,90,y-5,[260,160],[['Student','Signature']]+[[n,'________________'] for n,_,_ in TEAM],11)
        c.setFont(REG,12); c.drawString(L,y-20,'Project Guide: ____________________        Head of Department: ____________________')
def keypoints(c,y):
    c.setFont(BOLD,16); c.drawString(L,y,'Key Points'); y-=22; c.setFont(REG,14)
    for s in ['• The description is limited to evidence available in the inspected source.','• Model output is assistive recognition, not complete language interpretation.','• Measured performance requires a reproducible evaluation record.']:
        c.drawString(L,y,s); y-=19
def chapter(c,p,i,t,a,b):
    header(c,p); y=title(c,t,760); y=body(c,a,y); y=body(c,b,y)
    if i in (10,20,28):
        y-=4; table(c,54,y,[120,120,130,120],[['Browser / React','Express Gateway','FastAPI AI','Models / Data']],10); y-=38
        c.setFont(REG,10); c.drawCentredString(W/2,y,'Figure %d. Conceptual data flow based on inspected source code.'%i); y-=15
    elif i in (13,17,29,34):
        y=table(c,75,y,[130,290],[['Aspect','Verified position'],['Evidence','Repository source and configuration'],['Status','Runtime verification where noted'],['Reporting','No unsupported numerical claim']],10)
    keypoints(c,y)
def toc(c,p,part):
    header(c,p); y=title(c,'TABLE OF CONTENTS' if part==1 else 'TABLE OF CONTENTS (CONTINUED)',760)
    entries=[('Declaration',2),('Certificate',3),('Acknowledgement',4),('Table of Contents',5)]+[(x[0],7+i) for i,x in enumerate(chapters)]+[('Learning Outcomes',46),('Project Summary',46),('Bibliography',46),('Appendix A - Glossary',47),('Appendix B - Sample User Flows',48),('Appendix C - Project Verification Checklist',49),('Appendix D - Team Contribution and Viva Notes',50)]
    chunk=entries[:25] if part==1 else entries[25:]
    c.setFont(REG,12)
    for name,no in chunk: c.drawString(L,y,name); c.drawRightString(R,y,'.'*45+' '+str(no)); y-=22
def append(c,p,title_text,items):
    header(c,p); y=title(c,title_text,760)
    for item in items: y=body(c,item,y,13)
def build():
    c=canvas.Canvas(str(PDF),pagesize=A4); c.setTitle('SignSpeak AI Real Time Sign Language Interpreter')
    cover(c); c.showPage()
    formal(c,2,'DECLARATION','We hereby declare that the project report entitled “SignSpeak AI - Real-Time Sign Language Interpreter” is prepared by us in partial fulfilment of the requirements for the award of the Bachelor of Computer Applications degree of Bengaluru City University.\n\nWe state that the work presented in this report has been carried out by our project team under the guidance of the project guide in the Department of Computer Science, MS Ramaiah College of Arts, Science and Commerce - Autonomous, Bengaluru. The report describes the project concept, its user-facing features, the sign-recognition workflow, and the technologies identified by the project team.\n\nWe further declare that this report has not been submitted, either in full or in part, to any other university or institution for the award of any degree or diploma. Wherever information from external sources has been used, the sources have been acknowledged in the bibliography.',True); c.showPage()
    formal(c,3,'CERTIFICATE','This is to certify that the project report entitled “SignSpeak AI - Real-Time Sign Language Interpreter” has been prepared and submitted by the following students:\n\nMOHAMMED OWAIS ALAM - U18MB24S0105\nNIRANJAN M - U18MB24S0106\nRAMAN BHARADWAJ - U18MB24S0107\n\nThe project is submitted in partial fulfilment of the requirements for the award of the Bachelor of Computer Applications degree of Bengaluru City University. The work has been carried out under the supervision and guidance of the Department of Computer Science, MS Ramaiah College of Arts, Science and Commerce - Autonomous, Bengaluru.\n\nThe project report is recommended for evaluation, subject to the verification and approval of the project guide and the department.',False); c.setFont(REG,12); c.drawString(110,250,'________________________'); c.drawString(340,250,'________________________'); c.drawString(135,225,'Project Guide'); c.drawString(345,225,'Head of the Department'); c.drawString(105,195,'Name: ____________________'); c.drawString(335,195,'Name: ____________________'); c.drawString(105,165,'Date: ____________________'); c.drawString(335,165,'Date: ____________________'); c.drawString(80,100,'Examiners'); c.drawString(80,78,'1. ____________________________________'); c.drawString(80,56,'2. ____________________________________'); c.showPage()
    formal(c,4,'ACKNOWLEDGEMENT','We express our sincere gratitude to the management and faculty of MS Ramaiah College of Arts, Science and Commerce - Autonomous, Bengaluru, and the Department of Computer Science for the opportunity to undertake this project. We thank our project guide, whose name and designation will be entered after confirmation, for academic direction. We also acknowledge the maintainers of the open-source tools and documentation that informed the implementation. Finally, we thank our families and peers for their encouragement throughout the project work.'); c.showPage()
    toc(c,5,1); c.showPage(); toc(c,6,2); c.showPage()
    for i,(t,a,b) in enumerate(chapters,1): chapter(c,6+i,i,t,a,b); c.showPage()
    header(c,46); y=title(c,'LEARNING OUTCOMES',760); y=body(c,'The project strengthened practical understanding of component-based web development, structured API design, computer-vision landmarks, model delivery, configuration management, security-aware engineering, and evidence-based technical reporting. It also demonstrated why UI demonstrations, model files, and measured outcomes must be reported as distinct categories.',y); c.setFont(BOLD,16); c.drawString(L,y,'PROJECT SUMMARY'); y-=25; y=body(c,'SignSpeak AI integrates a React browser application, MediaPipe hand landmarks, local ONNX alphabet inference, an Express gateway, and FastAPI/Keras service capabilities. Its verified focus is assistive isolated-sign recognition, with transparent limitations around full linguistic translation and unmeasured performance.',y); c.setFont(BOLD,16); c.drawString(L,y,'BIBLIOGRAPHY'); y-=25
    for ref in ['React Documentation. https://react.dev/','Vite Documentation. https://vite.dev/','MediaPipe Tasks Vision Documentation. https://ai.google.dev/edge/mediapipe/solutions/vision','ONNX Runtime Web Documentation. https://onnxruntime.ai/docs/tutorials/web/','TensorFlow Keras Documentation. https://www.tensorflow.org/guide/keras','FastAPI Documentation. https://fastapi.tiangolo.com/','Express Documentation. https://expressjs.com/','MongoDB Documentation. https://www.mongodb.com/docs/','MDN Web Speech API. https://developer.mozilla.org/docs/Web/API/Web_Speech_API','Kaggle ASL Alphabet dataset resource identified in the project README. https://www.kaggle.com/datasets/grassknoted/asl-alphabet']: y=body(c,ref,y,11)
    c.showPage()
    append(c,47,'APPENDIX A - GLOSSARY',['ASL: American Sign Language.','Landmark: A detected anatomical point represented by coordinates.','ONNX: Open Neural Network Exchange model format.','Inference: Generating model output from supplied input.','Gateway: The service boundary that provides a unified application API.','Confidence: A model score that is not automatically a guarantee of correctness.']); c.showPage()
    append(c,48,'APPENDIX B - SAMPLE USER FLOWS',['1. Open the application and read the camera-use notice.','2. Grant camera permission when ready.','3. Position one hand within the camera view and wait for landmark detection.','4. Review displayed recognition state; treat no-hand and unknown states as normal outcomes.','5. Use the gesture library to study reference signs separately from live inference.','6. Use speech output only after confirming the visible text.']); c.showPage()
    append(c,49,'APPENDIX C - PROJECT VERIFICATION CHECKLIST',['□ Confirm the project guide, designation, academic year, dates, and signatures before printing.','□ Replace the cover logo placeholder with the authorised college logo.','□ Run front-end, gateway, and AI-service verification commands in the submission environment.','□ Record measured model metrics only after a reproducible evaluation.','□ Confirm API URLs, secrets, CORS, and camera permission behaviour.','□ Verify that all screenshots in a final bound copy are from the running project.']); c.showPage()
    header(c,50); y=title(c,'APPENDIX D - TEAM CONTRIBUTION AND VIVA QUESTIONS',760); y=table(c,55,y,[175,125,210],[['Member','Registration Number','Primary contribution']]+[[n,i,r] for n,i,r in TEAM],8); c.setFont(BOLD,16); c.drawString(L,y,'Suggested viva questions'); y-=26
    for q in ['1. Why does SignSpeak AI distinguish sign recognition from complete sign-language translation?','2. What are MediaPipe hand landmarks, and how many landmarks are used for one hand?','3. Explain the 90-dimensional feature input used by the browser ONNX alphabet model.','4. How does the browser ONNX inference path differ from the FastAPI Keras sequence path?','5. What is the role of the Express gateway in the system architecture?','6. Why are confidence thresholds and ambiguity checks important in live recognition?','7. What are the key limitations of the current static alphabet recognition approach?']:
        y=body(c,q,y,11)
    c.save(); print(PDF)
if __name__=='__main__': build()
