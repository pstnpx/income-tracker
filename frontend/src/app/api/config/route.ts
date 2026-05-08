import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  const email   = session?.user?.email ?? ""
  const res = await fetch(`${process.env.FLASK_API_URL}/api/config`, {
    cache: "no-store",
    headers: {
      "X-User-Email":   email,
      "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
    },
  })
  return Response.json(await res.json())
}

export async function PUT(request: Request) {
  const session = await auth()
  const email   = session?.user?.email ?? ""
  const body    = await request.json()
  const res = await fetch(`${process.env.FLASK_API_URL}/api/config`, {
    method: "PUT",
    headers: {
      "Content-Type":   "application/json",
      "X-User-Email":   email,
      "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  })
  return Response.json(await res.json(), { status: res.status })
}
