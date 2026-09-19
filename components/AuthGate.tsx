"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  isLoggedIn: boolean;
  onProceed: () => void;
  returnTo: string; // where to send the user back to after auth, e.g. "/cart"
  children: React.ReactNode; // the trigger, e.g. a "Submit quote" / "Checkout" button
}

/**
 * Wraps a checkout/quote submit action. If the user is logged in, clicking
 * the child button calls onProceed() directly. If not, it redirects to
 * /login?returnTo=... — cart contents live in localStorage via CartProvider,
 * so nothing is lost when the user comes back after logging in or signing up.
 */
export default function AuthGate({ isLoggedIn, onProceed, returnTo, children }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (isLoggedIn) {
      setPending(true);
      try {
        await onProceed();
      } finally {
        setPending(false);
      }
      return;
    }
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <div onClick={handleClick} className={pending ? "pointer-events-none opacity-60" : ""}>
      {children}
    </div>
  );
}
