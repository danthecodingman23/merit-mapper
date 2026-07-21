import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-[#e2e8f0] py-5 px-6 text-center text-xs text-[#94a3b8]">
      <span>&copy; {new Date().getFullYear()} MeritMapper. All rights reserved.</span>
      <span className="mx-2">·</span>
      <Link href="/privacy">
        <span className="hover:text-[#475569] transition-colors cursor-pointer">Privacy Policy</span>
      </Link>
      <span className="mx-2">·</span>
      <Link href="/contact">
        <span className="hover:text-[#475569] transition-colors cursor-pointer">Contact</span>
      </Link>
    </footer>
  );
}
