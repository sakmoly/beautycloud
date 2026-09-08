# Copyright (c) 2026, Beauty Cloud and contributors

"""Default section layouts for Beauty Web Page templates."""


def salon_landing_default_sections() -> list[dict]:
	"""Default macro blocks for Salon Landing pages."""
	return [
		{
			"section_type": "Hero",
			"title": "Your page title",
			"subtitle": "Short tagline for this treatment or offer",
			"link_label": "Book Now",
			"link_url": "/book",
			"secondary_link_label": "View Services",
			"secondary_link_url": "/services",
			"sort_order": 10,
		},
		{
			"section_type": "Trust Chips",
			"trust_chips": "Licensed stylists\nOnline booking\nPremium products",
			"sort_order": 20,
		},
		{
			"section_type": "Why Us",
			"title": "Why choose us",
			"sort_order": 30,
		},
		{
			"section_type": "Services Grid",
			"title": "Our treatments",
			"subtitle": "Choose a category to explore",
			"embed_limit": 3,
			"link_label": "See all",
			"link_url": "/services",
			"sort_order": 40,
		},
		{
			"section_type": "Text & Image",
			"title": "Treatment showcase",
			"subtitle": "What to expect",
			"body": "<p>Describe the experience, duration, and results your guests can expect.</p>",
			"image_position": "Right",
			"sort_order": 50,
		},
		{
			"section_type": "FAQ",
			"title": "Common questions",
			"sort_order": 60,
		},
		{
			"section_type": "Book CTA",
			"title": "Ready for your visit?",
			"subtitle": "Book online in minutes — choose services, pick a time, and confirm.",
			"link_label": "Book Now",
			"link_url": "/book",
			"sort_order": 70,
		},
	]


def salon_landing_default_why_us(section_sort_order: int = 30) -> list[dict]:
	return [
		{
			"section_sort_order": section_sort_order,
			"icon": "team",
			"title": "Expert stylists",
			"description": "Senior artists with years of experience in cut, colour, and occasion styling.",
			"sort_order": 1,
		},
		{
			"section_sort_order": section_sort_order,
			"icon": "sparkle",
			"title": "Premium products",
			"description": "Salon-grade colour, care, and nail systems — chosen for results, not shortcuts.",
			"sort_order": 2,
		},
		{
			"section_sort_order": section_sort_order,
			"icon": "booking",
			"title": "Book in minutes",
			"description": "Choose services, pick a stylist and time, confirm online — no phone tag.",
			"sort_order": 3,
		},
		{
			"section_sort_order": section_sort_order,
			"icon": "branch",
			"title": "Branches near you",
			"description": "Multiple locations with consistent quality and the same warm welcome.",
			"sort_order": 4,
		},
	]


def home_default_sections() -> list[dict]:
	"""CMS blocks for the website home page (below hero carousel)."""
	from beauty_cloud.setup.salon_content import HOME_ABOUT, HOME_TRUST_CHIPS, IMAGES

	return [
		{
			"section_type": "Trust Chips",
			"trust_chips": HOME_TRUST_CHIPS,
			"sort_order": 5,
		},
		{
			"section_type": "Services Grid",
			"title": "Our Services",
			"subtitle": "Treatments",
			"body": None,
			"embed_limit": 3,
			"link_label": "See all",
			"link_url": "/services",
			"sort_order": 10,
		},
		{
			"section_type": "Why Us",
			"title": "The Bahyea Difference",
			"sort_order": 20,
		},
		{
			"section_type": "Text & Image",
			"title": "A salon experience, reimagined",
			"subtitle": "About us",
			"body": HOME_ABOUT,
			"image": IMAGES["salon_interior"],
			"image_position": "Right",
			"link_label": "Our story",
			"link_url": "/about",
			"sort_order": 30,
		},
		{
			"section_type": "Stylists",
			"title": "Meet our artists",
			"subtitle": "The team behind your look",
			"embed_limit": 0,
			"sort_order": 35,
		},
		{
			"section_type": "Gallery",
			"title": "Inside the salon",
			"sort_order": 38,
		},
		{
			"section_type": "Branches",
			"title": "Visit us",
			"subtitle": "Find a branch near you",
			"embed_limit": 3,
			"link_label": "View all branches",
			"link_url": "/branches",
			"sort_order": 40,
		},
		{
			"section_type": "Book CTA",
			"title": "Your chair is waiting",
			"subtitle": "Book online in minutes — choose services, pick a time, and confirm with OTP.",
			"link_label": "Book Now",
			"link_url": "/book",
			"secondary_link_label": "Browse services",
			"secondary_link_url": "/services",
			"sort_order": 50,
		},
	]
