// Copyright (c) 2026, Beauty Cloud and contributors

frappe.ui.form.on("Beauty POS Register", {
	refresh(frm) {
		if (frm.doc.__islocal) {
			return;
		}

		frm.add_custom_button(__("Show API Key"), () => show_pairing_key(frm), __("Pairing"));
		frm.add_custom_button(__("Regenerate API Key"), () => regenerate_pairing_key(frm), __("Pairing"));
	},
});

function show_pairing_key(frm) {
	frappe.call({
		method: "beauty_cloud.beauty_cloud.doctype.beauty_pos_register.beauty_pos_register.get_pairing_key",
		args: { name: frm.doc.name },
		freeze: true,
		callback(r) {
			if (!r.message) {
				return;
			}
			frappe.msgprint({
				title: __("Register API Key"),
				indicator: "blue",
				message: pairing_key_message(r.message),
			});
		},
	});
}

function regenerate_pairing_key(frm) {
	frappe.confirm(__("Regenerate API key? Existing POS pairings for this register must be updated."), () => {
		frappe.call({
			method: "beauty_cloud.beauty_cloud.doctype.beauty_pos_register.beauty_pos_register.regenerate_pairing_key",
			args: { name: frm.doc.name },
			freeze: true,
			callback(r) {
				if (!r.message) {
					return;
				}
				frappe.msgprint({
					title: __("New Register API Key"),
					indicator: "green",
					message: pairing_key_message(r.message),
				});
			},
		});
	});
}

function pairing_key_message(key) {
	const safe = frappe.utils.escape_html(key);
	return `
		<p>${__("Copy this key into the POS Pair register screen.")}</p>
		<p><input class="input-with-feedback form-control" readonly value="${safe}" onclick="this.select(); document.execCommand('copy');" /></p>
		<p class="text-muted small">${__("Click the field to select and copy.")}</p>
	`;
}
