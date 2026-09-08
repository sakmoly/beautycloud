# Copyright (c) 2026, Beauty Cloud and contributors
"""
Salon marketing copy and image URLs for demo / seed content.
Images: Unsplash (free to use). Copy: original, inspired by luxury salon sites.
"""

# Hero carousel (home banner)
HERO_SLIDES = [
	{
		"image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&h=900&fit=crop&q=80",
		"eyebrow": "Hair & Styling",
		"title": "Where Beauty Meets Artistry",
		"subtitle": "Expert cuts, colour, and styling tailored to you — book your chair in seconds.",
		"cta_label": "Book Now",
		"cta_link": "/book",
		"sort_order": 1,
	},
	{
		"image": "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1600&h=900&fit=crop&q=80",
		"eyebrow": "Skin & Glow",
		"title": "Radiance, Restored",
		"subtitle": "Facials, skin treatments, and threading — calm rooms, visible results.",
		"cta_label": "Explore Treatments",
		"cta_link": "/services",
		"sort_order": 2,
	},
	{
		"image": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1600&h=900&fit=crop&q=80",
		"eyebrow": "Bridal & Occasions",
		"title": "Your Moment, Perfectly Styled",
		"subtitle": "Bridal packages, updos, and occasion looks — trials available by appointment.",
		"cta_label": "View Bridal Packages",
		"cta_link": "/p/bridal-package",
		"sort_order": 3,
	},
]

BRANDING = {
	"tagline": "Luxury salon care · Book online in minutes",
	"hero_title": "HAIR & BEAUTY",
	"hero_subtitle": "Discover premium hair, skin, and nail services. Book your appointment online.",
	"about_teaser": (
		"Bahyea Beauty is a destination salon for hair, skin, and nails — "
		"where skilled artists, premium products, and warm hospitality come together."
	),
	"promo_bar_text": "✨ Summer Glow — Book a facial or keratin treatment this month & enjoy complimentary scalp massage",
	"custom_footer_text": "Bahyea Beauty · Hair · Skin · Nails · Book online anytime",
	"instagram_url": "https://www.instagram.com/bahyeabeauty",
	"facebook_url": "https://www.facebook.com/bahyeabeauty",
	"twitter_url": "https://twitter.com/bahyeabeauty",
	"tiktok_url": "https://www.tiktok.com/@bahyeabeauty",
}

# Section images
IMAGES = {
	"salon_interior": "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200&h=800&fit=crop&q=80",
	"hair_styling": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=800&fit=crop&q=80",
	"nail_spa": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&h=800&fit=crop&q=80",
	"bridal": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&h=800&fit=crop&q=80",
	"keratin": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=800&fit=crop&q=80",
	"facial": "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1200&h=800&fit=crop&q=80",
	"summer": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=800&fit=crop&q=80",
	"team": "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&h=800&fit=crop&q=80",
}

ABOUT_BODY = """
<p>Founded with a simple belief — that every guest deserves to feel confident and cared for — Bahyea Beauty has grown into a full-service salon for hair, skin, and nails.</p>
<p>Our stylists and therapists train continuously on the latest techniques, from balayage and keratin smoothing to advanced facials and gel nail artistry. We use professional-grade products chosen for results, not shortcuts.</p>
<p>Whether you are preparing for a wedding, refreshing your everyday look, or treating yourself to an afternoon of calm, our team is here to listen, advise, and deliver.</p>
<ul>
<li>Personal consultations before every colour or major treatment</li>
<li>Online booking with instant confirmation</li>
<li>Multiple branches across the region</li>
<li>Arabic and English service</li>
</ul>
"""

HOME_TRUST_CHIPS = "Award-winning stylists\nOnline booking 24/7\nPremium salon products\nWalk-ins welcome"

HOME_ABOUT = (
	"<p>Step into a space designed for calm — soft lighting, curated playlists, and artists who take time to understand your hair, skin, and lifestyle.</p>"
	"<p>From a quick blow-dry before dinner to a full bridal transformation, every visit is treated with the same attention to detail.</p>"
)

CONTACT_BODY = """
<p>We would love to hear from you. Reach our team by phone or email, or visit any of our branches during opening hours.</p>
<p><strong>Email:</strong> info@beautycloud.local<br/>
<strong>Phone:</strong> +966 50 000 0000<br/>
<strong>Hours:</strong> Saturday – Thursday, 10:00 AM – 10:00 PM</p>
<p>For appointments, we recommend booking online — you will receive confirmation and reminders automatically.</p>
"""

BRIDAL = {
	"showcase_body": (
		"<p>Your wedding day deserves a look that photographs beautifully and lasts from ceremony to celebration. "
		"Our bridal artists begin with a consultation and optional trial, so you arrive on the day feeling certain and calm.</p>"
		"<p>Packages include hair styling, makeup coordination, and nail finishing — timed around your schedule with a dedicated lead artist.</p>"
	),
	"trust_chips": "Bridal trials available\nOn-location options\nArabic & English service\nBook 4+ weeks ahead",
}

KERATIN = {
	"showcase_body": (
		"<p>Our keratin smoothing treatment tames frizz, adds mirror-like shine, and cuts daily styling time — "
		"without compromising the health of your hair.</p>"
		"<p>Each session includes a deep cleanse, professional application, and blow-dry finish. "
		"Results typically last 8–12 weeks with sulphate-free aftercare.</p>"
	),
	"trust_chips": "Frizz-free for weeks\nFormaldehyde-free options\nIncludes blow-dry finish\nAftercare guide included",
}

SUMMER_PROMO = {
	"showcase_body": (
		"<p>This season, refresh your hair and skin with curated offers across our most-loved treatments — "
		"from hydrating facials and keratin to gel manicures and balayage refreshers.</p>"
		"<p>Book online to secure your preferred time. Limited slots available on weekends.</p>"
	),
	"trust_chips": "Limited-time offers\nBook online & save time\nAll branches participating\nNew guests welcome",
}

GALLERY_IMAGES = [
	{"image": IMAGES["hair_styling"], "caption": "Colour & cut", "sort_order": 1},
	{"image": IMAGES["nail_spa"], "caption": "Nail artistry", "sort_order": 2},
	{"image": IMAGES["facial"], "caption": "Skin treatments", "sort_order": 3},
	{"image": IMAGES["salon_interior"], "caption": "Our salon space", "sort_order": 4},
	{"image": IMAGES["bridal"], "caption": "Bridal styling", "sort_order": 5},
	{"image": IMAGES["keratin"], "caption": "Keratin smoothing", "sort_order": 6},
]
