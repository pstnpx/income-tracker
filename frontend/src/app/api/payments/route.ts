import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  const email   = session?.user?.email ?? ""
  const res = await fetch(`${process.env.FLASK_API_URL}/api/payments`, {
    next: { revalidate: 60 },
    headers: {
      "X-User-Email":   email,
      "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
    },
  })
  return Response.json(await res.json())
}
