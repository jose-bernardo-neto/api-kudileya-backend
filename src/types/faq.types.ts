/**
 * FAQ (Frequently Asked Question) entity
 */
export interface FAQ {
	id: string;
	question: string;
	answer: string;
	topic: string;
	createdAt: string; // ISO-8601
	updatedAt: string; // ISO-8601
}

/**
 * Input para criar uma nova FAQ
 */
export interface CreateFAQInput {
	question: string;
	answer: string;
	topic: string;
}

/**
 * Estrutura do arquivo data/faqs.json
 */
export interface FAQsData {
	faqs: FAQ[];
}
