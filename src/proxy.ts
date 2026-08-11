import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isAdminLogin = pathname === "/login";
  const isOperatorLogin = pathname === "/operator/login";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isOperatorArea = pathname.startsWith("/operator");

  if (isAuthApi) return NextResponse.next();

  if (!isLoggedIn) {
    if (isAdminLogin || isOperatorLogin) return NextResponse.next();

    const loginUrl = new URL(
      isOperatorArea ? "/operator/login" : "/login",
      req.nextUrl.origin,
    );
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role === "operator") {
    if (isAdminLogin || isOperatorLogin || !isOperatorArea) {
      return NextResponse.redirect(new URL("/operator", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // admin / staff
  if (isAdminLogin) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  if (isOperatorLogin) {
    return NextResponse.redirect(new URL("/operator", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
