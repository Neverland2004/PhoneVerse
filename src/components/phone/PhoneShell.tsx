import type { PropsWithChildren } from "react";

export function PhoneShell({ children }: PropsWithChildren) {
  return (
    <main className="phone-stage">
      <section className="phone-shell" aria-label="PhoneVerse 模拟手机">
        <div className="phone-screen">{children}</div>
      </section>
    </main>
  );
}
