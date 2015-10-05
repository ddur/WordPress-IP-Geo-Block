---
layout: post
title:  "Post Title"
date:   2015-01-01 00:00:00
categories: article changelog
published: false
script: []
inline:
---

<!--more-->

### <span id="sec">Title</span> ###

{% highlight php startinline linenos %}
code
{% endhighlight %}

<!-- html+php, css+php, js+php -->
```html
code
```

<!-- success, info, warning, danger -->
<div class="alert alert-info" role="alert">
	Information
</div>

[![title]({{ "/img/2015-xx/sample.png" | prepend: site.baseurl }}
  "title"
)][link]

<!-- http://www.emoji-cheat-sheet.com/ -->
<span class="emoji">
![emoji](https://assets-cdn.github.com/images/icons/emoji/unicode/1f604.png)
</span>

| Left-Aligned  | Center Aligned  | Right Aligned |
|:--------------|:---------------:|--------------:|
| col 3 is      | some wordy text |         $1600 |
| col 2 is      | centered        |           $12 |
| zebra stripes | are neat        |            $1 |

<div class="table-responsive">
	<cite></cite>
	<table class="table">
		<thead>
			<tr>
				<th>title1</th>
				<th>title2</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>content1</td>
				<td>content2</td>
			</tr>
		</tbody>
		<caption>caption</caption>
	</table>
</div>

[IP-Geo-Block]: https://wordpress.org/plugins/ip-geo-block/ "WordPress › IP Geo Block « WordPress Plugins"
[WP-ZEP]: {{ "/article/how-wpzep-works.html" | prepend: site.baseurl }} "How does WP-ZEP prevent zero-day attack?"