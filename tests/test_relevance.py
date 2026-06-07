import unittest
from pipeline.relevance import ArticleRelevanceEngine


class TestArticleRelevance(unittest.TestCase):
    def setUp(self):
        self.engine = ArticleRelevanceEngine()

    def test_high_relevance_for_primary_subject(self):
        article = {
            "title": "OpenAI releases GPT-5 with breakthrough capabilities",
            "snippet": "OpenAI announced the release of GPT-5, its most advanced model yet.",
            "content_text": "OpenAI has officially released GPT-5. The model represents a major leap...",
        }
        score = self.engine.score(article, "OpenAI", ["ChatGPT", "GPT-5"])
        self.assertGreaterEqual(score, 0.70)

    def test_low_relevance_for_passing_mention(self):
        article = {
            "title": "Google launches new AI product to compete with ChatGPT",
            "snippet": "Google unveiled Gemini Pro, a competitor to OpenAI's ChatGPT.",
            "content_text": "Google has launched Gemini Pro. The product aims to compete with ChatGPT and other AI assistants...",
        }
        score = self.engine.score(article, "OpenAI", ["ChatGPT"])
        self.assertLess(score, 0.50)

    def test_comparison_only_penalty(self):
        article = {
            "title": "Company X chatbot similar to ChatGPT",
            "snippet": "Company X launched a chatbot similar to ChatGPT.",
            "content_text": "Company X released their new chatbot, which is similar to ChatGPT in many ways...",
        }
        result = self.engine.analyze(article, "OpenAI", ["ChatGPT"])
        self.assertEqual(result["noise_type"], "comparison_only")

    def test_high_mention_density_boosts_score(self):
        article = {
            "title": "OpenAI strategy shift",
            "snippet": "OpenAI is changing direction.",
            "content_text": "OpenAI today announced. OpenAI CEO said. OpenAI plans to...",
        }
        score = self.engine.score(article, "OpenAI", [])
        self.assertGreaterEqual(score, 0.60)

    def test_empty_article_scores_zero(self):
        article = {"title": "", "snippet": "", "content_text": ""}
        score = self.engine.score(article, "OpenAI", [])
        self.assertEqual(score, 0.0)

    def test_analyze_returns_noise_type(self):
        article = {
            "title": "Random tech news",
            "snippet": "Nothing about OpenAI here.",
            "content_text": "Just some general tech news about phones and gadgets.",
        }
        result = self.engine.analyze(article, "OpenAI", ["ChatGPT"])
        self.assertIn(result["noise_type"], ["irrelevant", "passing_mention", None])


if __name__ == "__main__":
    unittest.main()
