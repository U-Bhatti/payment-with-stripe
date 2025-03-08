import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "dotenv/config";
import Stripe from "stripe";
import { HTTPException } from "hono/http-exception";

const app = new Hono();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

app.get("/", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basic HTML Page</title>
    <script src="https://js.stripe.com/v3/"></script>
</head>

<body>
    <h1>Checkout</h1>
    <button id="checkoutButton">Checkout</button>
    <script>
        const button = document.getElementById('checkoutButton')
        button.addEventListener('click', async () => {
            const response = await fetch('/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            const {id} = await response.json()
            const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}')
            await stripe.redirectToCheckout({ sessionId: id })
        })

    </script>
</body>

</html>`;
  return c.html(html);
});

app.post("/webhook", async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('stripe-signature')
  console.log("secret: " + process.env.STRIPE_WEBHOOK_SECRET!)
  console.log("signature: " + signature!)

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error('Webhook signature verification failed: ' + error)
    throw new HTTPException(400)
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(session)
  }

  if (event.type === 'customer.subscription.updated') {
    const session = event.data.object;
    console.log(session)
  }

  if (event.type === 'customer.subscription.deleted') {
    const session = event.data.object;
    console.log(session)
  }

  return c.text('success')
});

app.post("/checkout", async (c) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1QxvBmFPYLet8cFCQ4yZS8Cl",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });
    return c.json(session);
  } catch (error: any) {
    console.log(error);
    throw new HTTPException(500, { message: error?.message });
  }
});

app.get("/success", (c) => {
  return c.text("Payment Succesful");
});

app.get("/cancel", (c) => {
  return c.text("Payment Canceled!");
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
