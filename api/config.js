// GET /api/config - trả config công khai (để frontend khởi tạo Supabase client)
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    demo: !process.env.SUPABASE_URL || !process.env.OPENAI_API_KEY
  });
};
