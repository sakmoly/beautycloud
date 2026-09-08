# Copyright (c) 2026, Beauty Cloud and contributors


def public_file_url(path: str | None) -> str | None:
	if not path:
		return None
	if path.startswith("http://") or path.startswith("https://"):
		return path
	if not path.startswith("/"):
		path = f"/{path}"
	return path
