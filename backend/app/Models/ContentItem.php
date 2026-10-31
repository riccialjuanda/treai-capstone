<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Materi / soal TOEFL pada bank konten.
 */
class ContentItem extends Model
{
    protected $table = 'content_items';

    protected $fillable = [
        'title',
        'section',
        'category',
        'difficulty',
        'prompt',
    ];
}
