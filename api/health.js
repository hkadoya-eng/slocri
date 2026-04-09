export default function handler(req, res) {
  res.status(200).json({ aiEnabled: !!process.env.ANTHROPIC_API_KEY });
}
