import Link from "next/link";
import type { ReactNode } from "react";

import type { Branding, WebNavItem } from "@/lib/frappe/types";
import { withBasePath } from "@/lib/base-path";

function resolveNavHref(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return withBasePath(url.startsWith("/") ? url : `/${url}`);
}

function FooterNavLink({ item }: { item: WebNavItem }) {
  const href = resolveNavHref(item.url);
  const external = href.startsWith("http");
  if (external || item.open_in_new_tab) {
    return (
      <a href={href} className="bc-footer-link" target="_blank" rel="noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={href} className="bc-footer-link">
      {item.label}
    </Link>
  );
}

function SocialIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="bc-footer-social-icon" aria-hidden>
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function SocialLinks({ branding }: { branding?: Branding }) {
  const links = [
    { key: "facebook", url: branding?.facebook_url, label: "Facebook" },
    { key: "instagram", url: branding?.instagram_url, label: "Instagram" },
    { key: "twitter", url: branding?.twitter_url, label: "X (Twitter)" },
    { key: "tiktok", url: branding?.tiktok_url, label: "TikTok" },
  ].filter((item) => item.url);

  if (!links.length) return null;

  return (
    <div className="bc-footer-social-row">
      {links.map((item) => (
        <a
          key={item.key}
          href={item.url!}
          className="bc-footer-social-btn"
          target="_blank"
          rel="noreferrer"
          aria-label={item.label}
        >
          {item.key === "facebook" ? (
            <SocialIcon label={item.label}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.022 4.388 11.011 10.125 11.878v-8.385H7.078v-3.493h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.493h-2.796v8.385C19.612 23.084 24 18.095 24 12.073z" />
              </svg>
            </SocialIcon>
          ) : null}
          {item.key === "instagram" ? (
            <SocialIcon label={item.label}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </SocialIcon>
          ) : null}
          {item.key === "twitter" ? (
            <SocialIcon label={item.label}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </SocialIcon>
          ) : null}
          {item.key === "tiktok" ? (
            <SocialIcon label={item.label}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
              </svg>
            </SocialIcon>
          ) : null}
        </a>
      ))}
    </div>
  );
}

export function SiteFooter({
  branding,
  companyName,
  footerNav,
}: {
  branding?: Branding;
  companyName: string;
  footerNav: WebNavItem[];
}) {
  const year = new Date().getFullYear();
  const description =
    branding?.custom_footer_text ??
    "Premium hair, skin and nail services — book online anytime across our branches.";
  const bookLink = footerNav.find((item) => item.url.includes("/book"));

  return (
    <footer className="bc-site-footer">
      <div className="bc-site-footer-inner">
        <div className="bc-site-footer-grid">
          <div className="bc-site-footer-brand">
            <p className="bc-site-footer-logo">{companyName}</p>
            <p className="bc-site-footer-tagline">{description}</p>
            <SocialLinks branding={branding} />
            <Link href={withBasePath("/contact")} className="bc-footer-cta-link">
              Contact us →
            </Link>
          </div>

          <div>
            <p className="bc-footer-col-title">Explore</p>
            <div className="bc-footer-link-list">
              {footerNav.map((item) => (
                <FooterNavLink key={`${item.label}-${item.url}`} item={item} />
              ))}
            </div>
          </div>

          <div>
            <p className="bc-footer-col-title">Book & Visit</p>
            <div className="bc-footer-link-list">
              <Link href={withBasePath("/book")} className="bc-footer-link">
                Book appointment
              </Link>
              <Link href={withBasePath("/services")} className="bc-footer-link">
                Our services
              </Link>
              <Link href={withBasePath("/branches")} className="bc-footer-link">
                Branches
              </Link>
              <Link href={withBasePath("/about")} className="bc-footer-link">
                About us
              </Link>
            </div>
          </div>

          <div>
            <p className="bc-footer-col-title">Contact</p>
            <div className="bc-footer-contact-list">
              {branding?.support_phone ? <p>{branding.support_phone}</p> : null}
              {branding?.support_email ? (
                <a href={`mailto:${branding.support_email}`} className="bc-footer-link">
                  {branding.support_email}
                </a>
              ) : null}
              {!branding?.support_phone && !branding?.support_email ? (
                <>
                  <p>+966 50 000 0000</p>
                  <a href="mailto:info@beautycloud.local" className="bc-footer-link">
                    info@beautycloud.local
                  </a>
                </>
              ) : null}
            </div>
            {bookLink ? (
              <Link href={withBasePath("/book")} className="bc-footer-book-btn">
                Book Now
              </Link>
            ) : null}
          </div>
        </div>

        <div className="bc-site-footer-bottom">
          <p>© {year} {companyName}. All rights reserved.</p>
          <p className="bc-site-footer-powered">Online booking powered by Beauty Cloud</p>
        </div>
      </div>
    </footer>
  );
}
