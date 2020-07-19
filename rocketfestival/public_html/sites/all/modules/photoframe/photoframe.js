var photoframe_string = "Hello world!"
function photoframe(frame) {
	if (photoframe_string.indexOf("*" + frame) === -1) {
		photoframe_string += "*" + frame;
		$(document).ready(function(){
			class_name = '.photoframe-' + frame;
			var photo = $(class_name);
			photo.each(
				function(intIndex){
				$(this).before('<table class="photoframe-table"><tr><td class="photoframe-' + frame + '-tl"><div></div></td><td class="photoframe-' + frame + '-t"><div></div></td><td  class="photoframe-' + frame + '-tr"><div></div></td></tr><tr><td class="photoframe-' + frame + '-l"><div></div></td><td class="photoframe-' + frame + '-content photoframe-content photoframe-' + frame + '-frame-content photoframe-content"></td><td class="photoframe-' + frame + '-r"><div></div></td></tr><tr><td class="photoframe-' + frame + '-bl"><div></div></td><td class="photoframe-' + frame + '-b"><div></div></td><td  class="photoframe-' + frame + '-br"><div></div></td></tr></table>').prev().find('td.photoframe-' + frame + '-frame-content').append($(this));
				});
		});
	}
}