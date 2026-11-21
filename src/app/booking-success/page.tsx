import { Suspense } from "react";
import BookingSuccessClient from "./BookingSuccessClient";

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <BookingSuccessClient />
    </Suspense>
  );
}
