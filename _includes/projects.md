<h1 id="projects"></h1>

<h2 style="margin: 30px 0px -15px;">Projects<temp style="font-size:15px;"></temp></h2>

<div class="publications">
<ol class="bibliography">

{% for link in site.data.projects.main %}

<li>
<div class="pub-row">
  <div class="col-sm-3 abbr" style="position: relative;padding-right: 15px;padding-left: 15px;">
    <img src="{{ link.image }}" class="teaser img-fluid z-depth-1" style="width=100;height=40%">
            <abbr class="badge">{{ link.project_short }}</abbr>
  </div>
  <div class="col-sm-9" style="position: relative;padding-right: 15px;padding-left: 20px;">
      <div class="title" style="font-size: 20px;"><a href="{{ link.web }}">{{ link.title }}</a></div>
      <!-- <div class="author" style="font-weight: bold;">{{ link.authors }}</div> -->
      <div class="author">
        {% assign authors = link.authors | split: ',' %}
        {% for author in authors %}
          {% if author contains 'Chaoran Feng' %}
            <strong><u>{{ author }}</u></strong>{% if forloop.last == false %}, {% endif %}
          {% else %}
            {{ author }}{% if forloop.last == false %}, {% endif %}
          {% endif %}
        {% endfor %}
      </div>
      <div class="date">{{ link.date }}</div>
      <div class="periodical"><em>{{ link.project }}</em>
    </div>
    <div class="author">{{ link.abstract }}</div>
    <div class="links">
      {% if link.pdf %} 
      <a href="{{ link.pdf }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">PDF</a>
      {% endif %}
      {% if link.code %} 
      <a href="{{ link.code }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Code</a>
      {% endif %}
      {% if link.page %} 
      <a href="{{ link.page }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Project Page</a>
      {% endif %}
      {% if link.bibtex %} 
      <a href="{{ link.bibtex }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">BibTex</a>
      {% endif %}
      {% if link.web %} 
      <a href="{{ link.web }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Website</a>
      {% endif %}
      {% if link.github %} 
      <a href="{{ link.github }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Github</a>
      {% endif %}
      {% if link.notes %}
      <strong> <i style="color:#e74d3c">{{ link.notes }}</i></strong>
      {% endif %}
      {% if link.others %} 
      {{ link.others }}
      {% endif %}
    </div>
  </div>
</div>
</li>

<br>

{% endfor %}


