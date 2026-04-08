import { FAQService } from '../../src/services/faq.service';
import { JsonRepository } from '../../src/repositories/json.repository';
import { FAQ } from '../../src/types/faq.types';
import {
	NotFoundError,
	ConflictError,
} from '../../src/middlewares/error-handler.middleware';

// Mock do repository
jest.mock('../../src/repositories/json.repository');

describe('FAQService', () => {
	let faqService: FAQService;
	let mockRepository: jest.Mocked<JsonRepository<FAQ>>;

	const mockFAQ: FAQ = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		question: 'How to reset password?',
		answer: 'Go to settings and click reset password',
		topic: 'authentication',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	};

	beforeEach(() => {
		mockRepository = new JsonRepository('faqs.json') as jest.Mocked<
			JsonRepository<FAQ>
		>;
		faqService = new FAQService(mockRepository);
		jest.clearAllMocks();
	});

	describe('listFAQs', () => {
		it('should list FAQs with pagination', async () => {
			const mockResult = {
				items: [mockFAQ],
				nextCursor: '2024-01-01T00:00:00.000Z',
				hasMore: true,
			};

			mockRepository.findPaginated.mockResolvedValue(mockResult);

			const result = await faqService.listFAQs(undefined, undefined, 20);

			expect(result.data).toEqual([mockFAQ]);
			expect(result.next_cursor).toBe('2024-01-01T00:00:00.000Z');
			expect(result.has_more).toBe(true);
			expect(mockRepository.findPaginated).toHaveBeenCalledWith(
				undefined,
				20,
				undefined,
			);
		});

		it('should filter by topic', async () => {
			const mockResult = {
				items: [mockFAQ],
				nextCursor: null,
				hasMore: false,
			};

			mockRepository.findPaginated.mockResolvedValue(mockResult);

			await faqService.listFAQs('authentication', undefined, 20);

			expect(mockRepository.findPaginated).toHaveBeenCalled();
			const filterFn = mockRepository.findPaginated.mock.calls[0][2];

			expect(filterFn).toBeDefined();
			if (filterFn) {
				expect(filterFn(mockFAQ)).toBe(true);
				expect(filterFn({ ...mockFAQ, topic: 'other' })).toBe(false);
			}
		});

		it('should respect limit constraints', async () => {
			mockRepository.findPaginated.mockResolvedValue({
				items: [],
				nextCursor: null,
				hasMore: false,
			});

			await faqService.listFAQs(undefined, undefined, 200);

			expect(mockRepository.findPaginated).toHaveBeenCalledWith(
				undefined,
				100, // MAX_PAGE_LIMIT
				undefined,
			);
		});
	});

	describe('getFAQById', () => {
		it('should return FAQ when found', async () => {
			mockRepository.findById.mockResolvedValue(mockFAQ);

			const result = await faqService.getFAQById(mockFAQ.id);

			expect(result).toEqual(mockFAQ);
			expect(mockRepository.findById).toHaveBeenCalledWith(mockFAQ.id);
		});

		it('should throw NotFoundError when FAQ not found', async () => {
			mockRepository.findById.mockResolvedValue(null);

			await expect(faqService.getFAQById('non-existent')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('createFAQ', () => {
		it('should create a new FAQ', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockRepository.create.mockResolvedValue(mockFAQ);

			const input = {
				question: mockFAQ.question,
				answer: mockFAQ.answer,
				topic: mockFAQ.topic,
			};

			const result = await faqService.createFAQ(input);

			expect(result).toEqual(mockFAQ);
			expect(mockRepository.create).toHaveBeenCalled();
		});

		it('should normalize topic to lowercase', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockRepository.create.mockResolvedValue(mockFAQ);

			await faqService.createFAQ({
				question: 'Test question',
				answer: 'Test answer',
				topic: 'AUTHENTICATION',
			});

			const createCall = mockRepository.create.mock.calls[0][0];
			expect(createCall.topic).toBe('authentication');
		});

		it('should throw ConflictError when duplicate FAQ exists', async () => {
			mockRepository.findAll.mockResolvedValue([mockFAQ]);

			const input = {
				question: mockFAQ.question,
				answer: 'Different answer',
				topic: mockFAQ.topic,
			};

			await expect(faqService.createFAQ(input)).rejects.toThrow(ConflictError);
		});

		it('should trim whitespace from inputs', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockRepository.create.mockResolvedValue(mockFAQ);

			await faqService.createFAQ({
				question: '  Test question  ',
				answer: '  Test answer  ',
				topic: '  test  ',
			});

			const createCall = mockRepository.create.mock.calls[0][0];
			expect(createCall.question).toBe('Test question');
			expect(createCall.answer).toBe('Test answer');
			expect(createCall.topic).toBe('test');
		});
	});

	describe('updateFAQ', () => {
		it('should update an existing FAQ', async () => {
			mockRepository.findById.mockResolvedValue(mockFAQ);
			mockRepository.findAll.mockResolvedValue([mockFAQ]);
			mockRepository.update.mockResolvedValue({
				...mockFAQ,
				answer: 'Updated answer',
			});

			const result = await faqService.updateFAQ(mockFAQ.id, {
				answer: 'Updated answer',
			});

			expect(result.answer).toBe('Updated answer');
			expect(mockRepository.update).toHaveBeenCalled();
		});

		it('should throw NotFoundError when FAQ not found', async () => {
			mockRepository.findById.mockResolvedValue(null);

			await expect(
				faqService.updateFAQ('non-existent', { answer: 'Updated' }),
			).rejects.toThrow(NotFoundError);
		});

		it('should validate uniqueness when changing question or topic', async () => {
			const anotherFAQ = {
				...mockFAQ,
				id: 'another-id',
				question: 'Another question',
			};

			mockRepository.findById.mockResolvedValue(mockFAQ);
			mockRepository.findAll.mockResolvedValue([mockFAQ, anotherFAQ]);

			await expect(
				faqService.updateFAQ(mockFAQ.id, { question: 'Another question' }),
			).rejects.toThrow(ConflictError);
		});
	});

	describe('deleteFAQ', () => {
		it('should delete a FAQ', async () => {
			mockRepository.delete.mockResolvedValue(true);

			await faqService.deleteFAQ(mockFAQ.id);

			expect(mockRepository.delete).toHaveBeenCalledWith(mockFAQ.id);
		});

		it('should throw NotFoundError when FAQ not found', async () => {
			mockRepository.delete.mockResolvedValue(false);

			await expect(faqService.deleteFAQ('non-existent')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('searchFAQs', () => {
		it('should search FAQs by keyword', async () => {
			mockRepository.findAll.mockResolvedValue([mockFAQ]);

			const results = await faqService.searchFAQs('password');

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(mockFAQ);
		});

		it('should search case-insensitively', async () => {
			mockRepository.findAll.mockResolvedValue([mockFAQ]);

			const results = await faqService.searchFAQs('PASSWORD');

			expect(results).toHaveLength(1);
		});

		it('should search in question, answer, and topic', async () => {
			mockRepository.findAll.mockResolvedValue([mockFAQ]);

			const byQuestion = await faqService.searchFAQs('reset');
			const byAnswer = await faqService.searchFAQs('settings');
			const byTopic = await faqService.searchFAQs('auth');

			expect(byQuestion).toHaveLength(1);
			expect(byAnswer).toHaveLength(1);
			expect(byTopic).toHaveLength(1);
		});

		it('should return empty array when no matches', async () => {
			mockRepository.findAll.mockResolvedValue([mockFAQ]);

			const results = await faqService.searchFAQs('nonexistent');

			expect(results).toEqual([]);
		});
	});

	describe('listTopics', () => {
		it('should return unique topics sorted', async () => {
			const faqs = [
				{ ...mockFAQ, topic: 'authentication' },
				{ ...mockFAQ, topic: 'billing' },
				{ ...mockFAQ, topic: 'authentication' },
				{ ...mockFAQ, topic: 'account' },
			];

			mockRepository.findAll.mockResolvedValue(faqs);

			const topics = await faqService.listTopics();

			expect(topics).toEqual(['account', 'authentication', 'billing']);
		});

		it('should return empty array when no FAQs', async () => {
			mockRepository.findAll.mockResolvedValue([]);

			const topics = await faqService.listTopics();

			expect(topics).toEqual([]);
		});
	});
});
