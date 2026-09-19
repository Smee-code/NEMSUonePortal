"""Default content for editable landing-page sections (mirrors the original
hard-coded content). Used to seed SiteContent and as a fallback."""

SITE_CONTENT_DEFAULTS = {
    "in_focus": {
        "tag": "Research spotlight",
        "title": "Documenting coastal biodiversity along the Surigao del Sur seaboard.",
        "body": "A multi-year initiative by the College of Agriculture & Allied Sciences partners with local fishing communities to catalog reef species, monitor coastal erosion, and develop sustainable aquaculture practices for the Caraga region.",
        "category": "Research · Caraga marine biodiversity",
        "byline": "Featured · NEMSU Cantilan Research Office",
        "date": "May 2025",
        "imageUrl": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1400&q=80&auto=format&fit=crop",
    },
    "about": {
        "eyebrow": "About the campus",
        "heading": "A regional institution rooted in community, oriented toward excellence.",
        "paragraphs": [
            "The NEMSU Cantilan Campus is one of the key campuses of North Eastern Mindanao State University, located in the municipality of Cantilan in the province of Surigao del Sur. It serves students from Cantilan and surrounding municipalities, providing accessible and quality higher education to the community.",
            "The campus offers a wide range of undergraduate programs in technology, education, business, health sciences, and the arts — aligned with NEMSU's vision of producing globally competitive and morally upright graduates.",
        ],
        "badge_label": "Accredited",
        "badge_value": "AACCUP Level II",
        "imageUrl": "",
        "pillars": [
            {"num": "01", "title": "Instruction", "desc": "Quality academic delivery across undergraduate programs."},
            {"num": "02", "title": "Research", "desc": "Innovation, discovery and applied scholarship."},
            {"num": "03", "title": "Extension", "desc": "Community engagement and outreach programs."},
            {"num": "04", "title": "Production", "desc": "Sustainable enterprise and partnerships."},
        ],
    },
    "stats": {
        "eyebrow": "By the numbers",
        "heading": "A campus that scales with the region it serves.",
        "items": [
            {"num": 5000, "suffix": "+", "lbl": "Students enrolled", "desc": "Active learners across all programs"},
            {"num": 20, "suffix": "+", "lbl": "Academic programs", "desc": "Undergraduate degrees offered"},
            {"num": 6, "suffix": "", "lbl": "Departments", "desc": "Spanning technology to health"},
            {"num": 50, "suffix": "+", "lbl": "Years of service", "desc": "Serving the Caraga region"},
        ],
    },
    "purpose": {
        "eyebrow": "Our purpose",
        "heading": "Guided by a clear vision and a steady mission.",
        "vision_title": "A premier state university producing globally competitive graduates.",
        "vision_text": "To produce morally upright graduates who are agents of change for sustainable national development, equipped with the knowledge and values to serve the community and the country.",
        "mission_title": "Quality education, advanced research, and community engagement.",
        "mission_text": "To provide quality higher technological and professional education, advance research and development, and render extension and production services responsive to the needs of the community in northeastern Mindanao.",
    },
    "programs_intro": {
        "eyebrow": "Academic programs",
        "heading": "Undergraduate programs at Cantilan Campus.",
    },
    "campus_life": {
        "eyebrow": "Campus life",
        "heading": "Life at Cantilan.",
        "items": [
            {"tag": "Campus", "title": "A campus that grows with its community", "imageUrl": ""},
            {"tag": "Academics", "title": "Hands-on learning, beyond the classroom", "imageUrl": ""},
            {"tag": "Student life", "title": "From orgs to sports — find your community", "imageUrl": ""},
            {"tag": "Research", "title": "Applied science for the Caraga region", "imageUrl": ""},
            {"tag": "Faculty", "title": "Mentors invested in your growth", "imageUrl": ""},
            {"tag": "Events", "title": "Tradition meets contemporary culture", "imageUrl": ""},
        ],
    },
    "facilities": {
        "eyebrow": "Campus facilities",
        "heading": "Facilities built for learning.",
        "items": [
            {"icon": "ti-books", "name": "Library", "desc": "Extensive collection of academic resources and digital subscriptions."},
            {"icon": "ti-cpu", "name": "Computer Laboratory", "desc": "State-of-the-art computing facilities for IT and CS students."},
            {"icon": "ti-flask", "name": "Science Laboratory", "desc": "Fully equipped labs for nursing, biology, and chemistry programs."},
            {"icon": "ti-ball-football", "name": "Sports Complex", "desc": "Basketball courts, open fields, and recreational areas for students."},
        ],
    },
    "news": {
        "eyebrow": "News & updates",
        "heading": "The latest from Cantilan.",
        "items": [
            {"day": "28", "my": "May 2025", "tag": "Enrollment", "title": "Online Enrollment Now Open for A.Y. 2025–2026", "body": "All students of NEMSU Cantilan Campus — incoming freshmen, transferees, shiftees, and regular students — may now enroll online.", "imageUrl": ""},
            {"day": "20", "my": "May 2025", "tag": "Scholarship", "title": "Scholarship Applications Open for 1st Semester", "body": "CHED, DOST, LGU, and institutional scholarship applications are now being accepted at the OSAS office. Deadline is June 15, 2025.", "imageUrl": ""},
            {"day": "10", "my": "May 2025", "tag": "Accreditation", "title": "NEMSU Cantilan Achieves AACCUP Level II Accreditation", "body": "Several programs in the Cantilan Campus have achieved Level II accreditation, reflecting the campus's commitment to quality.", "imageUrl": ""},
        ],
    },
}
