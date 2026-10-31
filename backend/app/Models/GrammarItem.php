<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Bank soal Grammar Practice.
 */
class GrammarItem extends Model
{
    protected $table = 'grammar_items';

    public $timestamps = false;

    protected $fillable = [
        'level',
        'type',
        'focus',
        'prompt',
        'sentence',
        'options',
        'answer',
        'explanation',
    ];

    protected $casts = [
        'options' => 'array',
        'level' => 'string',
        'type' => 'string',
    ];
}
