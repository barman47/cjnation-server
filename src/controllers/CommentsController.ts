import { Request, Response } from 'express';

import CommentModel from '../models/Comment';
import PostModel from '../models/Post';
import { protect } from '../utils/auth';
import { returnError } from '../utils/returnError';
import { get, post, controller, use } from './decorators';
import { sendServerResponse } from '../utils/sendServerResponse';

@controller('/comments')
export class CommentsController {
    @use(protect)
    @post('/:postId')
    async addComment(req: Request, res: Response) {
        try {
            if (!req.body.text.trim()) {
                return sendServerResponse(res, {
                    success: false,
                    statusCode: 400,
                    errors: { text: 'Post comment is required!' },
                    msg: 'Invalid comment!'
                });
            }

            const [comment] = await Promise.all([
                CommentModel.create({ text: req.body.text, user: req.user._id, post: req.params.postId }),
                PostModel.updateOne({ _id: req.params.postId }, { $inc: { comments: 1 } })
            ]);
            const populatedComment = await CommentModel.findById(comment._id).populate({ path: 'user', select: 'name avatar' }).exec();

            return sendServerResponse(res, {
                success: true,
                statusCode: 201,
                data: populatedComment,
                msg: 'Comment added successfully'
            });
        } catch (err) {
            return returnError(err, res, 500, 'Failed to add comment');
        }
    }

    @get('/:postId')
    async getCommentsForPost(req: Request, res: Response) {
        try {
            const comments = await CommentModel.find({ post: req.params.postId })
                .populate({ path: 'user', select: 'name avatar' })
                .sort({ createdAt: 'desc' })
                .exec();
            return sendServerResponse(res, {
                success: true,
                statusCode: 200,
                data: comments,
                count: comments.length
            });
        } catch (err) {
            return returnError(err, res, 500, 'Failed to get post comments');
        }
    }
}